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
      const auditEntry = {
        action,
        performedBy: req.user?.uid || 'anonymous',
        performedByName: req.user?.name || 'anonymous',
        performedByRole: req.user?.role || 'anonymous',
        targetType: resource,
        summary: `${req.method} ${req.path} → ${status}`,
        timestamp: new Date().toISOString(),
      };
      logger.info('AUDIT', auditEntry);

      import('../database/connection-manager').then(({ getConnectionPool }) => {
        const pool = getConnectionPool();
        pool.query(
          `INSERT INTO audit_logs (user_id, action, resource, method, path, ip, user_agent, status_code, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [req.user?.uid || 'anonymous', action, resource, req.method, req.originalUrl, req.ip, req.get('user-agent'), res.statusCode]
        ).catch(() => {});
      }).catch(() => {});
    }
    return originalJson(body);
  };

  next();
}
