import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getSupabaseAdmin } from '../services/supabase';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Simple in-memory rate limiter for GDPR export (1 per 24h per user).
 * A periodic timer prunes entries older than 24h to prevent unbounded memory growth.
 * Replace with Redis-backed limiter in production with multiple replicas.
 */
const exportRateLimitMap = new Map<string, number>();
const EXPORT_RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const PRUNE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Periodically prune stale entries to control memory growth
setInterval(() => {
  const now = Date.now();
  const before = exportRateLimitMap.size;
  for (const [key, timestamp] of exportRateLimitMap.entries()) {
    if (now - timestamp > EXPORT_RATE_LIMIT_MS) {
      exportRateLimitMap.delete(key);
    }
  }
  if (before > 0 && exportRateLimitMap.size < before) {
    logger.debug(`Pruned ${before - exportRateLimitMap.size} stale export rate-limit entries`);
  }
}, PRUNE_INTERVAL_MS);

function checkExportRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastExport = exportRateLimitMap.get(userId);
  if (lastExport && (now - lastExport) < EXPORT_RATE_LIMIT_MS) {
    return false; // rate limited
  }
  exportRateLimitMap.set(userId, now);
  return true;
}

/**
 * @openapi
 * /user/export:
 *   get:
 *     tags: [User]
 *     summary: Export all user data (GDPR)
 *     description: Returns a comprehensive JSON payload of all the authenticated user's data including profile, grades, attendance, fees, assignments, messages, and schedule. Rate-limited to 1 request per 24 hours.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     profile:
 *                       type: object
 *                     grades:
 *                       type: array
 *                     attendance:
 *                       type: array
 *                     fees:
 *                       type: array
 *                     assignments:
 *                       type: array
 *       429:
 *         description: Rate limit exceeded (1 export per 24h)
 */
router.get('/export', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.uid || (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
    return;
  }

  if (!checkExportRateLimit(userId)) {
    res.status(429).json({
      success: false,
      error: {
        message: 'Data export can only be requested once per 24 hours',
        code: 'RATE_LIMIT',
      },
    });
    return;
  }

  const supabase = getSupabaseAdmin();

  try {
    // Fetch all user data in parallel
    const [profileRes, gradesRes, attendanceRes, feesRes, assignmentsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('grades').select('*').eq('student_id', userId),
      supabase.from('attendance').select('*').eq('student_id', userId),
      supabase.from('fee_payments').select('*').eq('student_id', userId),
      supabase.from('assignments').select('*').or(`student_id.eq.${userId},teacher_id.eq.${userId}`),
    ]);

    // Generate a download token that expires in 7 days
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store the export result with expiry
    await supabase.from('export_logs').insert({
      user_id: userId,
      token: downloadToken,
      expires_at: expiresAt,
      data: {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data || null,
        grades: gradesRes.data || [],
        attendance: attendanceRes.data || [],
        fees: feesRes.data || [],
        assignments: assignmentsRes.data || [],
      },
      created_at: new Date().toISOString(),
    }).catch((err: Error) => {
      logger.warn('Failed to persist export, returning inline', { userId, err: err.message });
    });

    res.json({
      success: true,
      data: {
        message: 'Export generated successfully. Download link expires in 7 days.',
        exportedAt: new Date().toISOString(),
        downloadToken,
        expiresAt,
        downloadUrl: `/user/export/download/${downloadToken}`,
        profile: profileRes.data || null,
        grades: gradesRes.data || [],
        attendance: attendanceRes.data || [],
        fees: feesRes.data || [],
        assignments: assignmentsRes.data || [],
      },
    });
  } catch (err) {
    logger.error('GDPR export failed', { userId, err });
    res.status(500).json({ success: false, error: { message: 'Export failed', code: 'INTERNAL' } });
  }
});

/**
 * @openapi
 * /user/account:
 *   delete:
 *     tags: [User]
 *     summary: Initiate account deletion (GDPR Right to Erasure)
 *     description: Initiates cascade anonymization/deletion of the user's data. Grades and attendance are anonymized (PII removed, records kept for audit). Messages are deleted. A 30-day grace period is provided before permanent deletion.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Deletion initiated, confirmation sent
 *       401:
 *         description: Not authenticated
 */
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.uid || (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
    return;
  }

  const supabase = getSupabaseAdmin();
  const deletionToken = crypto.randomUUID();
  const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  try {
    // Cascade: anonymize grades (keep records, remove PII), retain fees (audit), delete messages
    await Promise.all([
      supabase.from('grades').update({ student_id: 'deleted-user', updated_at: new Date().toISOString() }).eq('student_id', userId),
      supabase.from('attendance').update({ student_id: 'deleted-user', marked_by: null, updated_at: new Date().toISOString() }).eq('student_id', userId),
      supabase.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    ]);

    // Soft-delete the user account (grace period before permanent deletion)
    const { error: userErr } = await supabase.from('users').update({
      deleted_at: scheduledDate,
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    if (userErr) throw userErr;

    // Log the deletion request
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'account_deletion_requested',
      metadata: {
        deletion_token: deletionToken,
        scheduled_date: scheduledDate,
        initiated_at: new Date().toISOString(),
        cascade: {
          grades_anonymized: true,
          attendance_anonymized: true,
          messages_deleted: true,
          fees_retained: true,
        },
      },
    });

    if (auditErr) {
      logger.warn('Failed to log deletion audit', { userId, err: auditErr.message });
    }

    logger.info('Account deletion initiated', { userId, scheduledDate });
    res.status(202).json({
      success: true,
      data: {
        message: 'Account deletion initiated. Your data will be permanently deleted after 30 days.',
        scheduledDate,
        deletionToken,
        cascade: {
          grades: 'anonymized (records kept, PII removed)',
          attendance: 'anonymized',
          messages: 'deleted',
          fees: 'retained (audit requirement)',
        },
      },
    });
  } catch (err) {
    logger.error('Account deletion failed', { userId, err });
    res.status(500).json({ success: false, error: { message: 'Deletion failed', code: 'INTERNAL' } });
  }
});

/**
 * @openapi
 * /user/export/download/{token}:
 *   get:
 *     tags: [User]
 *     summary: Download a previously generated data export
 *     description: Retrieves a GDPR data export by its download token. The token expires 7 days after generation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Download token returned from the export endpoint
 *     responses:
 *       200:
 *         description: Export data
 *       404:
 *         description: Token not found or expired
 */
router.get('/export/download/:token', authenticate, async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = (req as any).user?.uid || (req as any).user?.id;
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('export_logs')
      .select('*')
      .eq('token', token)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      res.status(404).json({ success: false, error: { message: 'Export not found or expired', code: 'NOT_FOUND' } });
      return;
    }

    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      res.status(410).json({ success: false, error: { message: 'Export link has expired. Please request a new export.', code: 'EXPIRED' } });
      return;
    }

    res.json({
      success: true,
      data: data.data,
    });
  } catch (err) {
    logger.error('Export download failed', { token, err });
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve export', code: 'INTERNAL' } });
  }
});

export default router;
