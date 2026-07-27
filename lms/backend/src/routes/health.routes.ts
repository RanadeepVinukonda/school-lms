import { Router, Request, Response } from 'express';
import { env } from '../config/env';

const router = Router();
let startedAt = Date.now();

/* ── Shared types ─────────────────────────────────────────── */

interface CheckResult {
  status: 'ok' | 'error' | 'skipped';
  latency_ms: number;
  provider?: string;
  error?: string;
}

interface DeepHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  checks: Record<string, CheckResult>;
}

/* ── Shallow health check (existing behavior) ─────────────── */

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Shallow health check
 *     description: Returns basic service status including database connectivity and uptime. No authentication required.
 *     operationId: getHealth
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: [ok]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: boolean
 *                     uptime:
 *                       type: integer
 *                       description: Seconds since server start
 *       503:
 *         description: Service is degraded (database unreachable)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', async (_req: Request, res: Response) => {
  let dbOk = false;
  try {
    const { healthCheck } = await import('../database/connection-manager');
    dbOk = await healthCheck();
  } catch {
    dbOk = false;
  }

  const status = dbOk ? 'ok' : 'degraded';
  const statusCode = dbOk ? 200 : 503;

  res.status(statusCode).json({
    success: statusCode === 200,
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    },
  });
});

/* ── Timeout helper ───────────────────────────────────────── */

async function runWithTimeout<T>(label: string, fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} check timed out after ${ms}ms`)), ms);
  });
  const result = await Promise.race([fn(), timeout]);
  clearTimeout(timer!);
  return result;
}

/* ── Individual checks ────────────────────────────────────── */

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const { healthCheck } = await import('../database/connection-manager');
    const ok = await healthCheck();
    return { status: ok ? 'ok' : 'error', latency_ms: Date.now() - start };
  } catch {
    return { status: 'error', latency_ms: Date.now() - start, error: 'Database health check threw' };
  }
}

async function checkAIProvider(): Promise<CheckResult> {
  const start = Date.now();

  if (!env.GEMINI_API_KEY) {
    return { status: 'skipped', latency_ms: Date.now() - start, provider: 'none' };
  }

  try {
    // ponytail: lightweight list-models endpoint to verify connectivity, no token consumed
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal, method: 'GET' });
    clearTimeout(timer);

    return {
      status: res.ok ? 'ok' : 'error',
      latency_ms: Date.now() - start,
      provider: 'gemini',
    };
  } catch {
    return {
      status: 'error',
      latency_ms: Date.now() - start,
      provider: 'gemini',
      error: 'Connectivity check failed',
    };
  }
}

async function checkSupabase(): Promise<CheckResult> {
  const start = Date.now();

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { status: 'skipped', latency_ms: Date.now() - start };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: supabaseKey },
      signal: controller.signal,
    });
    clearTimeout(timer);

    return {
      status: res.ok ? 'ok' : 'error',
      latency_ms: Date.now() - start,
    };
  } catch {
    return {
      status: 'error',
      latency_ms: Date.now() - start,
      error: 'Connectivity check failed',
    };
  }
}

/* ── Deep health check ────────────────────────────────────── */

/**
 * @openapi
 * /health/deep:
 *   get:
 *     tags: [Health]
 *     summary: Deep health check
 *     description: Probes all critical subsystems (database, AI provider, Supabase) with timeouts. Returns overall status and per-check latency.
 *     operationId: getHealthDeep
 *     security: []
 *     responses:
 *       200:
 *         description: All systems operational or partially degraded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [status, timestamp, uptime, checks]
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, down]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: integer
 *                   description: Seconds since server start
 *                 checks:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/CheckResult'
 *       503:
 *         description: Critical subsystem down
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeepHealthResponse'
 */
router.get('/deep', async (_req: Request, res: Response) => {
  const checks: Record<string, CheckResult> = {};
  const criticalDown: string[] = [];
  const nonCriticalDown: string[] = [];

  // Database — critical path
  try {
    checks.database = await runWithTimeout('database', checkDatabase, 5000);
  } catch (err) {
    checks.database = { status: 'error', latency_ms: 5000, error: (err as Error).message };
  }
  if (checks.database.status !== 'ok') criticalDown.push('database');

  // AI provider — non-critical
  try {
    checks.ai_provider = await runWithTimeout('ai_provider', checkAIProvider, 5000);
  } catch (err) {
    checks.ai_provider = { status: 'error', latency_ms: 5000, provider: 'gemini', error: (err as Error).message };
  }
  if (checks.ai_provider.status !== 'ok' && checks.ai_provider.status !== 'skipped') {
    nonCriticalDown.push('ai_provider');
  }

  // Supabase — non-critical
  try {
    checks.supabase = await runWithTimeout('supabase', checkSupabase, 5000);
  } catch (err) {
    checks.supabase = { status: 'error', latency_ms: 5000, error: (err as Error).message };
  }
  if (checks.supabase.status !== 'ok' && checks.supabase.status !== 'skipped') {
    nonCriticalDown.push('supabase');
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'down';
  if (criticalDown.length > 0) {
    overallStatus = 'down';
  } else if (nonCriticalDown.length > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const httpStatus = overallStatus === 'down' ? 503 : 200;

  res.status(httpStatus).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    checks,
  } satisfies DeepHealthResponse);
});

/* ── Readiness probe (Kubernetes-style) ─────────────────── */

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Returns 200 if DB responds to SELECT 1, otherwise 503. For load balancers / k8s.
 *     operationId: getHealthReady
 *     security: []
 *     responses:
 *       200:
 *         description: Ready
 *       503:
 *         description: Not ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { healthCheck } = await import('../database/connection-manager');
    const ok = await healthCheck();
    if (ok) {
      res.status(200).json({ status: 'ready', latency_ms: Date.now() - start });
    } else {
      res.status(503).json({ status: 'not_ready', error: 'Database health check failed', latency_ms: Date.now() - start });
    }
  } catch (err) {
    res.status(503).json({ status: 'not_ready', error: (err as Error).message, latency_ms: Date.now() - start });
  }
});

/* ── Table existence check (diagnostic, no auth) ────────────── */

router.get('/tables', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ success: false, error: { message: 'Not found' } });
    return;
  }
  const { getSupabaseAdmin } = await import('../services/supabase');
  const supabase = getSupabaseAdmin();
  const tables = ['fee_structures', 'fee_payments', 'timetable', 'classes', 'subjects', 'courses', 'firestore_docs', 'users', 'schools'];
  const results: Record<string, { exists: boolean; count: number; error?: string }> = {};
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      results[table] = { exists: !error, count: count ?? 0, error: error?.message };
    } catch (err) {
      results[table] = { exists: false, count: 0, error: (err as Error).message };
    }
  }
  res.json({ success: true, tables: results });
});

export default router;
