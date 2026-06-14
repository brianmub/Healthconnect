import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import templateRoutes from './routes/templates';
import campaignRoutes from './routes/campaigns';
import appointmentRoutes from './routes/appointments';
import automationRoutes from './routes/automation';
import analyticsRoutes from './routes/analytics';
import settingsRoutes from './routes/settings';
import webhookRoutes from './routes/webhooks';

import { startAutomationCron } from './workers/automationWorker';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 2. Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP for login/tokens
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests, please try again later.' }
});

// Apply general limiter to all routes
app.use(generalLimiter);

// 3. Body parsers (skip parsing raw bodies for webhooks if raw body parsing is needed, else standard JSON)
app.use(express.json());

// 4. Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/webhooks/twilio', webhookRoutes);

// Simple healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 5. Start server and background cron worker
app.listen(PORT, () => {
  console.log(`🚀 HealthConnect Server running on port ${PORT}`);
  
  // Start the background cron automation task
  startAutomationCron();
});
