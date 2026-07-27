import { Request, Response, NextFunction } from 'express';

export function requireAcceptJson(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/health') || req.path.startsWith('/api-docs') || req.path === '/') {
    return next();
  }

  const accept = req.headers.accept || '';
  if (accept && !accept.includes('application/json') && !accept.includes('*/*')) {
    res.status(406).json({
      success: false,
      error: { message: 'This API only supports application/json responses', code: 'NOT_ACCEPTABLE' },
    });
    return;
  }
  next();
}
