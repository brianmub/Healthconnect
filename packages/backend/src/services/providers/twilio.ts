import twilio from 'twilio';
import { SmsProvider, WhatsappProvider, SendResult } from '../types';

export class TwilioProvider implements SmsProvider, WhatsappProvider {
  private client: twilio.Twilio | null = null;
  private isMock = false;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken || accountSid.startsWith('ACmock') || accountSid.includes('xxxx')) {
      console.log('⚠️ Twilio credentials missing or mock. Running in Mock Mode.');
      this.isMock = true;
    } else {
      try {
        this.client = twilio(accountSid, authToken);
      } catch (err) {
        console.error('Failed to initialize Twilio client, falling back to Mock Mode.', err);
        this.isMock = true;
      }
    }
  }

  async sendSms(to: string, body: string): Promise<SendResult> {
    const from = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    if (this.isMock) {
      const mockSid = 'SM' + Math.random().toString(36).substring(2, 17).toUpperCase();
      console.log(`[MOCK SMS] From: ${from} To: ${to} Body: "${body}" | SID: ${mockSid}`);
      return { externalId: mockSid, status: 'queued' };
    }

    try {
      const response = await this.client!.messages.create({
        body,
        from,
        to,
      });
      return {
        externalId: response.sid,
        status: response.status === 'failed' ? 'failed' : 'queued',
        error: response.errorMessage || undefined,
      };
    } catch (err: any) {
      console.error('Twilio SMS error:', err);
      return {
        externalId: '',
        status: 'failed',
        error: err.message || 'Unknown Twilio error',
      };
    }
  }

  async sendWhatsApp(to: string, body: string): Promise<SendResult> {
    const rawFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    const from = rawFrom.startsWith('whatsapp:') ? rawFrom : `whatsapp:${rawFrom}`;
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (this.isMock) {
      const mockSid = 'SM' + Math.random().toString(36).substring(2, 17).toUpperCase();
      console.log(`[MOCK WHATSAPP] From: ${from} To: ${formattedTo} Body: "${body}" | SID: ${mockSid}`);
      return { externalId: mockSid, status: 'queued' };
    }

    try {
      const response = await this.client!.messages.create({
        body,
        from,
        to: formattedTo,
      });
      return {
        externalId: response.sid,
        status: response.status === 'failed' ? 'failed' : 'queued',
        error: response.errorMessage || undefined,
      };
    } catch (err: any) {
      console.error('Twilio WhatsApp error:', err);
      return {
        externalId: '',
        status: 'failed',
        error: err.message || 'Unknown Twilio WhatsApp error',
      };
    }
  }
}
