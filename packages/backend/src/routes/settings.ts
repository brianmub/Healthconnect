import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  testSms,
  testWhatsapp,
  getSmsBalance,
} from '../controllers/settingsController';
import { getUsers, createUser } from '../controllers/userController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/sms/test', testSms);
router.get('/sms/balance', getSmsBalance);
router.post('/whatsapp/test', testWhatsapp);

// User accounts management - ADMIN role only
router.get('/users', requireRole(['ADMIN']), getUsers);
router.post('/users', requireRole(['ADMIN']), createUser);

export default router;

