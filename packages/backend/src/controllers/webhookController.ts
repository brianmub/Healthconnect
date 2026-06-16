import { Request, Response } from 'express';
import twilio from 'twilio';
import crypto from 'crypto';
import { prisma } from '../config/db';

// Update recipient status helper
async function updateRecipientStatus(messageSid: string, status: string, errorCode?: string) {
  if (!messageSid) return;

  // Map Twilio statuses to our DeliveryStatus
  let deliveryStatus: 'SENT' | 'DELIVERED' | 'FAILED' | 'UNDELIVERED' | 'QUEUED' = 'SENT';
  
  if (status === 'delivered') {
    deliveryStatus = 'DELIVERED';
  } else if (status === 'failed') {
    deliveryStatus = 'FAILED';
  } else if (status === 'undelivered') {
    deliveryStatus = 'UNDELIVERED';
  } else if (status === 'sent') {
    deliveryStatus = 'SENT';
  } else if (status === 'queued') {
    deliveryStatus = 'QUEUED';
  }

  const updateData: any = {
    status: deliveryStatus,
  };

  if (deliveryStatus === 'DELIVERED') {
    updateData.deliveredAt = new Date();
  }

  if (errorCode) {
    updateData.failReason = `Twilio Error Code: ${errorCode}`;
  }

  await prisma.messageRecipient.updateMany({
    where: { externalId: messageSid },
    data: updateData,
  });
}

// Twilio signature verification middleware
export async function validateTwilioSignature(req: Request, res: Response, next: any) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'] as string;
  
  // Get absolute URL of the webhook request (Twilio requires the exact requested URL)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;

  const isMock = !authToken || authToken.startsWith('mock') || authToken.includes('xxxx');
  const isDev = process.env.NODE_ENV !== 'production';

  // Skip signature verification in local development or if using mock token
  if (isMock || isDev) {
    console.log('ℹ️ Skipping Twilio signature validation in Dev/Mock mode.');
    return next();
  }

  if (!signature) {
    return res.status(400).send('Missing Twilio Signature header.');
  }

  try {
    const isValid = twilio.validateRequest(
      authToken!,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      return res.status(403).send('Invalid Twilio Signature.');
    }

    next();
  } catch (err) {
    console.error('Twilio signature verification error:', err);
    res.status(500).send('Internal validation error.');
  }
}

export async function handleSmsWebhook(req: Request, res: Response) {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  
  console.log(`✉️ SMS Webhook received - SID: ${MessageSid}, Status: ${MessageStatus}, ErrorCode: ${ErrorCode || 'None'}`);

  try {
    await updateRecipientStatus(MessageSid, MessageStatus, ErrorCode);
    res.status(200).send('<Response></Response>');
  } catch (err) {
    console.error('Error handling SMS webhook:', err);
    res.status(500).send('Error processing callback');
  }
}

export async function handleWhatsappWebhook(req: Request, res: Response) {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;

  console.log(`💬 WhatsApp Webhook received - SID: ${MessageSid}, Status: ${MessageStatus}, ErrorCode: ${ErrorCode || 'None'}`);

  try {
    await updateRecipientStatus(MessageSid, MessageStatus, ErrorCode);
    res.status(200).send('<Response></Response>');
  } catch (err) {
    console.error('Error handling WhatsApp webhook:', err);
    res.status(500).send('Error processing callback');
  }
}

// =========================================================
// SMS Localhost Delivery Report Webhook
// POST /api/webhooks/sms-localhost
// Events: sms.delivered | sms.failed | mno.status.changed
// =========================================================

export function validateSmsLocalhostSignature(req: Request, res: Response, next: any) {
  const secret = process.env.SMS_LOCALHOST_WEBHOOK_SECRET || '';
  const receivedSig = req.headers['x-webhook-signature'] as string | undefined;

  const isDev = process.env.NODE_ENV !== 'production';
  const isMockSecret = !secret;

  // Skip in dev or when secret not configured yet
  if (isDev || isMockSecret) {
    console.log('ℹ️ Skipping SMS Localhost webhook signature check in Dev/unconfigured mode.');
    return next();
  }

  if (!receivedSig) {
    return res.status(401).json({ error: 'Missing X-Webhook-Signature header' });
  }

  // Compute HMAC-SHA256 over the raw body captured before JSON parsing
  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const safeExpected = Buffer.from(expected, 'hex');
  const safeReceived = Buffer.from(receivedSig, 'hex');

  if (safeExpected.length !== safeReceived.length ||
      !crypto.timingSafeEqual(safeExpected, safeReceived)) {
    console.warn('⚠️ Invalid SMS Localhost webhook signature.');
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

export async function handleSmsLocalhostWebhook(req: Request, res: Response) {
  const event = req.body?.event as string | undefined;

  console.log(`📨 SMS Localhost webhook received — event: ${event || 'unknown'}`);

  try {
    if (event === 'sms.delivered') {
      const messageId: string = req.body?.message_id || '';
      if (messageId) {
        await prisma.messageRecipient.updateMany({
          where: { externalId: messageId },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
        console.log(`✅ Marked ${messageId} as DELIVERED`);
      }
    } else if (event === 'sms.failed') {
      const messageId: string = req.body?.message_id || '';
      const reason: string = req.body?.error || req.body?.note || 'SMS Localhost delivery failure';
      if (messageId) {
        await prisma.messageRecipient.updateMany({
          where: { externalId: messageId },
          data: { status: 'FAILED', failReason: reason },
        });
        console.log(`❌ Marked ${messageId} as FAILED — ${reason}`);
      }
    } else if (event === 'mno.status.changed') {
      // Log MNO status changes — could be used for alerting in future
      const { mno, state, note } = req.body;
      console.log(`📡 MNO status change — ${mno}: ${state}${note ? ` (${note})` : ''}`);
    }

    // Respond 204 as required by the SMS Localhost webhook spec
    res.status(204).send();
  } catch (err) {
    console.error('Error handling SMS Localhost webhook:', err);
    res.status(500).json({ error: 'Internal error processing webhook' });
  }
}
