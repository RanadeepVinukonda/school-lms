import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { checkUpcomingDeadlines } from '../jobs/sendReminders.job';
import { cleanupExpiredData } from '../jobs/cleanupExpired.job';
import { generateWeeklyReport, generateMonthlyReport } from '../jobs/generateReports.job';

const router = Router();

function validateCronSecret(req: { headers: Record<string, unknown> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers['x-cron-secret'];
  return header === secret;
}

const triggerJobSchema = z.object({}).passthrough();

router.post('/reminders', authenticate, requireRole('admin'), validate(triggerJobSchema), asyncHandler(async (_req, res) => {
  await checkUpcomingDeadlines();
  res.json({ success: true, message: 'Reminders sent' });
}));

router.post('/cleanup', authenticate, requireRole('admin'), validate(triggerJobSchema), asyncHandler(async (_req, res) => {
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

router.post('/reports', authenticate, requireRole('admin'), validate(triggerJobSchema), asyncHandler(async (req, res) => {
  const type = req.body.type as string;
  if (type === 'monthly') {
    await generateMonthlyReport();
  } else {
    await generateWeeklyReport();
  }
  res.json({ success: true, message: `${type || 'weekly'} report generated` });
}));

router.post('/cron/reports', asyncHandler(async (req, res) => {
  if (!validateCronSecret(req)) {
    res.status(401).json({ success: false, message: 'Invalid cron secret' });
    return;
  }
  const type = req.body.type as string;
  if (type === 'monthly') {
    await generateMonthlyReport();
  } else {
    await generateWeeklyReport();
  }
  res.json({ success: true, message: `${type || 'weekly'} report generated` });
}));

export default router;
