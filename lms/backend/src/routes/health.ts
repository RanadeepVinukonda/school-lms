import { Router, Request, Response } from 'express';

const router = Router();

let startedAt = Date.now();

router.get('/health', async (_req: Request, res: Response) => {
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
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    },
  });
});

export default router;
