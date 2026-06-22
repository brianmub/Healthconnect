import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { messagingService } from '../services/messagingService';
import { validateAndNormalizePhone } from '../utils/phoneValidation';

export async function getSettings(req: Request, res: Response) {
  try {
    let settings = await prisma.setting.findUnique({ where: { id: 'global' } });
    
    // Create default settings if they don't exist yet
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          id: 'global',
          clinicName: 'SmileCare Dental Practice',
          clinicPhone: '+263771234567',
          clinicAddress: '123 Samora Machel Ave, Harare',
        },
      });
    }

    res.json(settings);
  } catch (err) {
    console.error('getSettings error:', err);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  const {
    clinicName,
    clinicPhone,
    clinicAddress,
    clinicLogo,
    twilioAccountSid,
    twilioAuthToken,
    twilioPhoneNumber,
    twilioWhatsappNumber,
    metaWhatsappPhoneId,
    metaWhatsappToken,
    atApiKey,
    atUsername,
    atSenderId,
    smsLocalhostApiKey,
    smsLocalhostSenderId,
    defaultCountryCode,
  } = req.body;

  try {
    // Validate phone number if provided
    let normalizedPhone: string | undefined;
    if (clinicPhone) {
      const validated = validateAndNormalizePhone(clinicPhone);
      if (!validated) {
        return res.status(400).json({ error: 'Invalid clinic phone number' });
      }
      normalizedPhone = validated;
    }

    // Build a sparse update object — only include fields that were explicitly
    // sent in the request body (not undefined) AND are non-empty strings.
    // This prevents one settings form from overwriting/clearing fields that
    // belong to a different form (e.g. submitting the SMS form should not
    // clear the WhatsApp token).
    const sparse = (value: any) =>
      value !== undefined && value !== '' ? value : undefined;

    const updateData: Record<string, any> = {};
    if (sparse(clinicName) !== undefined)           updateData.clinicName           = clinicName;
    if (normalizedPhone !== undefined)              updateData.clinicPhone          = normalizedPhone;
    if (sparse(clinicAddress) !== undefined)        updateData.clinicAddress        = clinicAddress;
    if (sparse(clinicLogo) !== undefined)           updateData.clinicLogo           = clinicLogo;
    if (sparse(twilioAccountSid) !== undefined)     updateData.twilioAccountSid     = twilioAccountSid;
    if (sparse(twilioAuthToken) !== undefined)      updateData.twilioAuthToken      = twilioAuthToken;
    if (sparse(twilioPhoneNumber) !== undefined)    updateData.twilioPhoneNumber    = twilioPhoneNumber;
    if (sparse(twilioWhatsappNumber) !== undefined) updateData.twilioWhatsappNumber = twilioWhatsappNumber;
    if (sparse(metaWhatsappPhoneId) !== undefined)  updateData.metaWhatsappPhoneId  = metaWhatsappPhoneId;
    if (sparse(metaWhatsappToken) !== undefined)    updateData.metaWhatsappToken    = metaWhatsappToken;
    if (sparse(atApiKey) !== undefined)             updateData.atApiKey             = atApiKey;
    if (sparse(atUsername) !== undefined)           updateData.atUsername           = atUsername;
    if (sparse(atSenderId) !== undefined)           updateData.atSenderId           = atSenderId;
    if (sparse(smsLocalhostApiKey) !== undefined)   updateData.smsLocalhostApiKey   = smsLocalhostApiKey;
    if (sparse(smsLocalhostSenderId) !== undefined) updateData.smsLocalhostSenderId = smsLocalhostSenderId;
    if (sparse(defaultCountryCode) !== undefined)   updateData.defaultCountryCode   = defaultCountryCode;

    const settings = await prisma.setting.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        clinicName: clinicName || 'SmileCare Dental Practice',
        clinicPhone: normalizedPhone || '+263771234567',
        clinicAddress: clinicAddress || '123 Samora Machel Ave, Harare',
        clinicLogo,
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber,
        twilioWhatsappNumber,
        metaWhatsappPhoneId,
        metaWhatsappToken,
        atApiKey,
        atUsername,
        atSenderId,
        smsLocalhostApiKey,
        smsLocalhostSenderId,
        defaultCountryCode: defaultCountryCode || 'ZW',
      },
    });

    res.json(settings);
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

export async function testSms(req: Request, res: Response) {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message fields are required' });
  }

  const normalizedPhone = validateAndNormalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    // Sync credentials saved in the DB into process.env so the provider
    // picks them up even if they were never set in the .env file.
    const settings = await prisma.setting.findUnique({ where: { id: 'global' } });
    if (settings?.smsLocalhostApiKey)   process.env.SMS_LOCALHOST_API_KEY   = settings.smsLocalhostApiKey;
    if (settings?.smsLocalhostSenderId) process.env.SMS_LOCALHOST_SENDER_ID = settings.smsLocalhostSenderId;
    // Activate the correct provider based on which credentials are saved in DB
    if (settings?.smsLocalhostApiKey)   process.env.SMS_PROVIDER            = 'sms_localhost';

    const result = await messagingService.sendSms(normalizedPhone, message);
    if (result.status === 'failed') {
      return res.status(500).json({ error: result.error || 'Failed to send test SMS' });
    }

    res.json({ message: 'Test SMS sent successfully', sid: result.externalId });
  } catch (err: any) {
    console.error('testSms error:', err);
    res.status(500).json({ error: err.message || 'Error occurred while sending test SMS' });
  }
}

export async function testWhatsapp(req: Request, res: Response) {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message fields are required' });
  }

  const normalizedPhone = validateAndNormalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  try {
    const result = await messagingService.sendWhatsApp(normalizedPhone, message);
    if (result.status === 'failed') {
      return res.status(500).json({ error: result.error || 'Failed to send test WhatsApp message' });
    }

    res.json({ message: 'Test WhatsApp message sent successfully', sid: result.externalId });
  } catch (err: any) {
    console.error('testWhatsapp error:', err);
    res.status(500).json({ error: err.message || 'Error occurred while sending test WhatsApp message' });
  }
}

export async function getSmsBalance(req: Request, res: Response) {
  // Prefer the key stored in the DB (saved via Settings UI) over the .env value
  const settings = await prisma.setting.findUnique({ where: { id: 'global' } }).catch(() => null);
  const apiKey = settings?.smsLocalhostApiKey || process.env.SMS_LOCALHOST_API_KEY || '';

  // Return a clear signal when the provider is not SMS Localhost or key is missing
  if (!apiKey || apiKey.startsWith('your_') || apiKey.includes('xxxx')) {
    return res.json({ sms_credits: null, provider: process.env.SMS_PROVIDER || 'twilio', error: 'SMS Localhost API key not configured' });
  }

  try {
    const response = await fetch('https://sms.localhost.co.zw/api/v1/billing/balance/', {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!response.ok) {
      const errBody: any = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        sms_credits: null,
        error: errBody?.error || `SMS Localhost returned HTTP ${response.status}`,
      });
    }

    const data: any = await response.json();
    return res.json({ sms_credits: data?.sms_credits ?? data?.balance ?? null, provider: 'smsLocalhost' });
  } catch (err: any) {
    console.error('getSmsBalance error:', err);
    return res.status(500).json({ sms_credits: null, error: err.message || 'Failed to fetch SMS credit balance' });
  }
}

