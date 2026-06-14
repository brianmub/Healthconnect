import { Request, Response } from 'express';
import twilio from 'twilio';
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
