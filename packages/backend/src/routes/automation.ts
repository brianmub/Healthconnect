import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
} from '../controllers/automationController';

const router = Router();

router.use(authenticateJWT);

router.get('/rules', getRules);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);
router.patch('/rules/:id/toggle', toggleRule);

export default router;
