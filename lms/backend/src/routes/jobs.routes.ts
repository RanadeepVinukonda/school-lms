import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { checkUpcomingDeadlines } from '../jobs/sendReminders.job';
import { cleanupExpiredData } from '../jobs/cleanupExpired.job';
import { env } from '../config/env';

const router = Router();

function validateCronSecret(req: { headers: Record<string, unknown> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers['x-cron-secret'];
  return header === secret;
}

router.post('/reminders', authenticate, asyncHandler(async (_req, res) => {
  await checkUpcomingDeadlines();
  res.json({ success: true, message: 'Reminders sent' });
}));

router.post('/cleanup', authenticate, asyncHandler(async (_req, res) => {
  await cleanupExpiredData();
  res.json({ success: true, message: 'Cleanup completed' });
}));

router.post('/cron/reminders', asyncHandler(async (req, res) => {
  if (!validateCronSecret(req)) {
    res.status(401).json({ success: false, message: 'Invalid cron secret' });
    return;
  }
  await checkUpcomingDeadlines();
  res.json({ success: true, message: 'Reminders sent' });
}));

router.post('/cron/cleanup', asyncHandler(async (req, res) => {
  if (!validateCronSecret(req)) {
    res.status(401).json({ success: false, message: 'Invalid cron secret' });
    return;
  }
  await cleanupExpiredData();
  res.json({ success: true, message: 'Cleanup completed' });
}));

export default router;
