import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  testSms,
  testWhatsapp,
} from '../controllers/settingsController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/sms/test', testSms);
router.post('/whatsapp/test', testWhatsapp);

export default router;
