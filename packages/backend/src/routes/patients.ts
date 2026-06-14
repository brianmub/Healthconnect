import { Router } from 'express';
import multer from 'multer';
import { authenticateJWT } from '../middleware/auth';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  toggleOptOut,
  exportPatients,
  importPatients,
  bulkAction,
} from '../controllers/patientController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateJWT);

router.get('/', getPatients);
router.get('/export', exportPatients);
router.post('/import', upload.single('file'), importPatients);
router.post('/bulk', bulkAction);
router.get('/:id', getPatientById);
router.post('/', createPatient);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);
router.post('/:id/opt-out', toggleOptOut);

export default router;
