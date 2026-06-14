import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  sendCampaign,
  pauseCampaign,
  cancelCampaign,
  getCampaignRecipients,
  resendFailedRecipients,
} from '../controllers/campaignController';

const router = Router();

router.use(authenticateJWT);

router.get('/', getCampaigns);
router.post('/', createCampaign);
router.get('/:id', getCampaignById);
router.post('/:id/send', sendCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/cancel', cancelCampaign);
router.get('/:id/recipients', getCampaignRecipients);
router.post('/:id/resend-failed', resendFailedRecipients);

export default router;
