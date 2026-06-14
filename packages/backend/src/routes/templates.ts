import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
