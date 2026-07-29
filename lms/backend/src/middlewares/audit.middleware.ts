import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const status = res.statusCode;
    if (status >= 200 && status < 300) {
      const action = `${req.method} ${req.path}`;
      const resource = req.path.split('/')[1] || 'unknown';
      logger.info('AUDIT', {
        action,
        performedBy: req.user?.uid || 'anonymous',
        performedByName: req.user?.name || 'anonymous',
        performedByRole: req.user?.role || 'anonymous',
        targetType: resource,
        summary: `${req.method} ${req.path} → ${status}`,
        timestamp: new Date().toISOString(),
      });
    }
    return originalJson(body);
  };

  next();
}
