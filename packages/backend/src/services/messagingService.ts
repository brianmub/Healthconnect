import { prisma } from '../config/db';
import { SendResult, SmsProvider, WhatsappProvider } from './types';
import { TwilioProvider } from './providers/twilio';
import { AfricasTalkingProvider } from './providers/africasTalking';
import { MetaWhatsappProvider } from './providers/metaWhatsapp';
import { SmsLocalhostProvider } from './providers/smsLocalhost';
import { validateAndNormalizePhone } from '../utils/phoneValidation';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Instantiate providers lazily or once
const twilioProvider = new TwilioProvider();
const africasTalkingProvider = new AfricasTalkingProvider();
const metaWhatsappProvider = new MetaWhatsappProvider();
const smsLocalhostProvider = new SmsLocalhostProvider();

export class MessagingService {
  private redisConnection: IORedis | null = null;
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
        this.bullQueue = new Queue('message-queue', { connection: this.redisConnection as any });
        this.initBullWorker();
        console.log('✅ BullMQ queue initialized successfully.');
      } catch (err) {
        console.error('⚠️ Redis connection failed. Falling back to In-Memory Queue.');
      }
    } else {
      console.log('ℹ️ No REDIS_URL provided. Using In-Memory Queue.');
    }
  }

  // Sync credentials stored in DB into process.env so providers always
  // pick them up for BOTH test sends and bulk campaign sends.
  private async syncCredentialsFromDb(): Promise<void> {
    try {
      const settings = await prisma.setting.findUnique({ where: { id: 'global' } });
      if (!settings) return;

      // SMS Localhost credentials
      if (settings.smsLocalhostApiKey)   process.env.SMS_LOCALHOST_API_KEY   = settings.smsLocalhostApiKey;
      if (settings.smsLocalhostSenderId) process.env.SMS_LOCALHOST_SENDER_ID = settings.smsLocalhostSenderId;

      // Auto-detect provider: if SMS Localhost key is saved in DB, activate it
      if (settings.smsLocalhostApiKey && !process.env.SMS_PROVIDER) {
        process.env.SMS_PROVIDER = 'smsLocalhost';
      }

      // Twilio credentials
      if (settings.twilioAccountSid)   process.env.TWILIO_ACCOUNT_SID    = settings.twilioAccountSid;
      if (settings.twilioAuthToken)    process.env.TWILIO_AUTH_TOKEN     = settings.twilioAuthToken;
      if (settings.twilioPhoneNumber)  process.env.TWILIO_PHONE_NUMBER   = settings.twilioPhoneNumber;
    } catch (err) {
      console.error('syncCredentialsFromDb error:', err);
    }
  }

  // Retrieve active SMS provider based on SMS_PROVIDER env variable
  // Supported values: 'twilio' | 'africasTalking' | 'smsLocalhost'
  private getSmsProvider(): SmsProvider {
    const activeSmsGateway = process.env.SMS_PROVIDER || 'twilio';
    if (activeSmsGateway === 'africasTalking') {
      return africasTalkingProvider;
    }
    if (activeSmsGateway === 'smsLocalhost') {
      return smsLocalhostProvider;
    }
    return twilioProvider;
  }

  // Retrieve active WhatsApp provider based on WHATSAPP_PROVIDER env variable
  private getWhatsappProvider(): WhatsappProvider {
    const activeWaGateway = process.env.WHATSAPP_PROVIDER || 'twilio';
    if (activeWaGateway === 'meta') {
      return metaWhatsappProvider;
    }
    return twilioProvider;
  }

  // Interpolate double curly braces variables
  interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }
    return result;
  }

  // Send a single SMS
  async sendSms(to: string, body: string): Promise<SendResult> {
    // Always sync DB credentials first so bulk sends work the same as test sends
    await this.syncCredentialsFromDb();
    const provider = this.getSmsProvider();
    
    // Auto-append unsubscribe info if not present
    let finalBody = body;
    if (!finalBody.includes('Reply STOP to unsubscribe')) {
      finalBody = `${finalBody.trim()}\n\nReply STOP to unsubscribe`;
    }

    return provider.sendSms(to, finalBody);
  }

  // Send a single WhatsApp message
  async sendWhatsApp(to: string, body: string): Promise<SendResult> {
    // Always sync DB credentials first
    await this.syncCredentialsFromDb();
    const provider = this.getWhatsappProvider();

    // Auto-append unsubscribe info if not present
    let finalBody = body;
    if (!finalBody.includes('Reply STOP to unsubscribe')) {
      finalBody = `${finalBody.trim()}\n\nReply STOP to unsubscribe`;
    }

    return provider.sendWhatsApp(to, finalBody);
  }

  // Send bulk messages for a campaign
  async sendBulk(campaignId: string): Promise<void> {
    // 1. Fetch all pending message recipients for this campaign
    const recipients = await prisma.messageRecipient.findMany({
      where: {
        campaignId,
        status: 'PENDING',
      },
      include: {
        patient: true,
        campaign: {
          include: {
            template: true,
            createdBy: true,
          }
        }
      }
    });

    if (recipients.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'SENT', sentAt: new Date() }
      });
      return;
    }

    // Update campaign status to SENDING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' }
    });

    // 2. Queue the messages
    if (this.bullQueue) {
      // Add each recipient processing job to BullMQ
      for (const recipient of recipients) {
        await this.bullQueue.add('send-individual-message', {
          recipientId: recipient.id,
          campaignId,
        });
      }
    } else {
      // In-memory processor fallback
      // Process in background using setTimeout to not block the Express event loop
      setTimeout(() => this.processInMemoryBulk(recipients, campaignId), 0);
    }
  }

  // In-memory queue handler for development (without Redis)
  private async processInMemoryBulk(recipients: any[], campaignId: string): Promise<void> {
    console.log(`🚀 Processing bulk sending in-memory for Campaign ${campaignId}...`);
    
    const batchSize = 10;
    const delayMs = 500;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(async (recipient) => {
        await this.processIndividualMessage(recipient);
      }));

      // Rate limit delay between batches (if there are more batches)
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Mark campaign as SENT
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentAt: new Date() }
    });
    console.log(`✅ Finished processing Campaign ${campaignId} in-memory.`);
  }

  // Helper method to process a single message delivery (opt-out checks, interpolation, send, status update)
  public async processIndividualMessage(recipient: any): Promise<void> {
    const { id: recipientId, patient, campaign, phone } = recipient;

    // Check opt-out status
    if (patient.optedOut) {
      await prisma.messageRecipient.update({
        where: { id: recipientId },
        data: { status: 'OPT_OUT', failReason: 'Patient has opted out of messaging' }
      });
      return;
    }

    // Format template variables
    // Format dates nicely
    const appts = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: { dateTime: 'desc' },
      take: 1
    });
    
    let appointmentDateStr = '';
    let appointmentTimeStr = '';
    
    if (appts.length > 0) {
      const apptDate = new Date(appts[0].dateTime);
      appointmentDateStr = apptDate.toLocaleDateString();
      appointmentTimeStr = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Default clinic settings values
    const clinicName = "SmileCare Dental Practice";
    const clinicPhone = "+263771234567";

    const interpolatedBody = this.interpolateTemplate(campaign.template.body, {
      firstName: patient.firstName,
      lastName: patient.lastName,
      appointmentDate: appointmentDateStr,
      appointmentTime: appointmentTimeStr,
      clinicName,
      clinicPhone,
    });

    // Determine target channel (resolve Channel.BOTH into the patient's preferred or default SMS/WhatsApp)
    let finalChannel = campaign.channel;
    if (finalChannel === 'BOTH') {
      finalChannel = patient.whatsapp ? 'WHATSAPP' : 'SMS';
    }

    // Validate phone number
    const normalizedPhone = validateAndNormalizePhone(phone);
    if (!normalizedPhone) {
      await prisma.messageRecipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED', failReason: 'Invalid phone number format' }
      });
      return;
    }

    // Update recipient to QUEUED
    await prisma.messageRecipient.update({
      where: { id: recipientId },
      data: { status: 'QUEUED' }
    });

    let result: SendResult;
    if (finalChannel === 'WHATSAPP') {
      result = await this.sendWhatsApp(normalizedPhone, interpolatedBody);
    } else {
      result = await this.sendSms(normalizedPhone, interpolatedBody);
    }

    // Update status in database
    await prisma.messageRecipient.update({
      where: { id: recipientId },
      data: {
        status: result.status === 'queued' ? 'SENT' : 'FAILED',
        externalId: result.externalId || null,
        failReason: result.error || null,
        sentAt: result.status === 'queued' ? new Date() : null,
        senderId: campaign.createdById // Audit log link
      }
    });
  }

  // BullMQ Worker Setup
  private initBullWorker(): void {
    if (!this.redisConnection) return;

    this.bullWorker = new Worker('message-queue', async (job) => {
      const { recipientId } = job.data;
      
      const recipient = await prisma.messageRecipient.findUnique({
        where: { id: recipientId },
        include: {
          patient: true,
          campaign: {
            include: {
              template: true,
              createdBy: true
            }
          }
        }
      });

      if (recipient) {
        await this.processIndividualMessage(recipient);
      }
    }, {
      connection: this.redisConnection as any,
      concurrency: 1, // Process sequentially per worker to respect rate limits
    });

    this.bullWorker.on('completed', (job) => {
      console.log(`Job completed: ${job.id}`);
    });

    this.bullWorker.on('failed', (job, err) => {
      console.error(`Job failed: ${job?.id}`, err);
    });
  }
}
export const messagingService = new MessagingService();
