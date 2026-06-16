import { Router, urlencoded } from 'express';
import {
  handleSmsWebhook,
  handleWhatsappWebhook,
  validateTwilioSignature,
  validateSmsLocalhostSignature,
  handleSmsLocalhostWebhook,
} from '../controllers/webhookController';

const router = Router();

// Twilio sends urlencoded requests
router.post('/sms', urlencoded({ extended: false }), validateTwilioSignature, handleSmsWebhook);
router.post('/whatsapp', urlencoded({ extended: false }), validateTwilioSignature, handleWhatsappWebhook);

// SMS Localhost sends JSON — mounted at /api/webhooks/sms-localhost
router.post('/', validateSmsLocalhostSignature, handleSmsLocalhostWebhook);

export default router;
