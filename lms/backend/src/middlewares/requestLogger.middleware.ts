import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = logger.child({ requestId });

    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      contentLength: res.getHeader('content-length') || 0,
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || req.headers['referrer'] || '',
      remoteAddr: req.ip || req.socket.remoteAddress || '',
    };

    if (res.statusCode >= 500) {
      log.error('request completed', meta);
    } else if (res.statusCode >= 400) {
      log.warn('request completed', meta);
    } else {
      log.info('request completed', meta);
    }
  });

  next();
}
