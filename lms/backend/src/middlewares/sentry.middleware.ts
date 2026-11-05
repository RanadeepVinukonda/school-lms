import { Request, Response, NextFunction } from 'express';

export function sentryMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const Sentry = require('@sentry/node');
    const hub = Sentry.getCurrentHub?.();
    if (!hub) return next();

    if (req.user) {
      Sentry.setUser({ id: req.user.uid, email: req.user.email });
    }

    Sentry.addBreadcrumb({
      category: 'http',
      type: 'http',
      data: { method: req.method, url: req.originalUrl, status_code: res.statusCode },
    });

    const transaction = Sentry.startTransaction({
      name: `${req.method} ${req.route?.path || req.path}`,
      op: 'http.request',
    });
    Sentry.configureScope((scope: any) => scope.setSpan(transaction));

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        Sentry.captureException(new Error(`HTTP ${res.statusCode}: ${req.method} ${req.originalUrl}`));
      }
      transaction.finish();
    });
  } catch {
    // Sentry not available
  }
  next();
}
