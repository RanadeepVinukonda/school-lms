import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const status = res.statusCode;
    if (status >= 200 && status < 300) {
      const auditEntry = {
        action: `${req.method} ${req.path}`,
        performedBy: req.user?.uid || 'anonymous',
        performedByName: req.user?.name || 'anonymous',
        performedByRole: req.user?.role || 'anonymous',
        targetType: req.path.split('/')[1] || 'unknown',
        summary: `${req.method} ${req.path} → ${status}`,
        timestamp: new Date().toISOString(),
      };
      logger.info('AUDIT', auditEntry);
    }
    return originalJson(body);
  };

  next();
}
