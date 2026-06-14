import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  getOverview,
  getMessagesOverTime,
  getDeliveryRates,
  getCampaignPerformance,
} from '../controllers/analyticsController';

const router = Router();

router.use(authenticateJWT);

router.get('/overview', getOverview);
router.get('/messages-over-time', getMessagesOverTime);
router.get('/delivery-rates', getDeliveryRates);
router.get('/campaign-performance', getCampaignPerformance);

export default router;
