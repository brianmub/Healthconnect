import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
