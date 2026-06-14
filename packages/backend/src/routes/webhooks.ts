import { Router, urlencoded } from 'express';
import { handleSmsWebhook, handleWhatsappWebhook, validateTwilioSignature } from '../controllers/webhookController';

const router = Router();

// Twilio sends urlencoded requests
router.post('/sms', urlencoded({ extended: false }), validateTwilioSignature, handleSmsWebhook);
router.post('/whatsapp', urlencoded({ extended: false }), validateTwilioSignature, handleWhatsappWebhook);

export default router;
