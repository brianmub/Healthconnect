import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  sendQuickReminder,
} from '../controllers/appointmentController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);
router.post('/:id/send-reminder', sendQuickReminder);

export default router;
