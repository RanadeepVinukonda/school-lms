import { Router } from 'express';
import { metricsHandler } from '../../middlewares/metrics.middleware';
import { getSupabaseAdmin } from '../../services/supabase';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import settingsRoutes from '../settings.routes';
import jobsRoutes from '../jobs.routes';
import auditRoutes from '../audit.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
    },
  });
});

router.get('/ready', async (_req, res) => {
  const supabase = getSupabaseAdmin();
  let dbOk = false;
  try {
    const { error } = await supabase!.from('users').select('id').limit(1);
    dbOk = !error;
  } catch { dbOk = false; }
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'degraded', database: dbOk });
});

router.get('/metrics', authenticate, requireRole('admin'), metricsHandler);
router.use('/settings', settingsRoutes);
router.use('/jobs', jobsRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
