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

    const settings = await prisma.setting.upsert({
      where: { id: 'global' },
      update: {
        clinicName,
        clinicPhone: normalizedPhone,
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
        defaultCountryCode,
      },
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
