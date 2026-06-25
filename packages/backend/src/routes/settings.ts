import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';
import {
  getSettings,
  updateSettings,
  testSms,
  testWhatsapp,
  getSmsBalance,
  getSmsLogs,
} from '../controllers/settingsController';
import { getUsers, createUser, updateUserRole, updateUserPassword } from '../controllers/userController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/sms/test', testSms);
router.get('/sms/balance', getSmsBalance);
router.get('/sms/logs', getSmsLogs);
router.post('/whatsapp/test', testWhatsapp);

// User accounts management - ADMIN role only
router.get('/users', requireRole(['ADMIN']), getUsers);
router.post('/users', requireRole(['ADMIN']), createUser);
router.put('/users/:id/role', requireRole(['ADMIN']), updateUserRole);
router.put('/users/:id/password', requireRole(['ADMIN']), updateUserPassword);

export default router;

