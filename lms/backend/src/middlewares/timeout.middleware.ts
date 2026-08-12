import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Global request timeout (default 30s).
 *
 * Routes that legitimately need more time (e.g. OCR + AI pipelines that can
 * take minutes) can extend the budget by setting `res.locals.requestTimeoutMs`
 * BEFORE doing any async work — the middleware re-checks the override whenever
 * the default timer fires. The override is only honored when it is LARGER than
 * the default, so it can never accidentally shorten another route's timeout.
 */
export function timeoutMiddleware(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    const effectiveTimeout = () => {
      const override = (res.locals as { requestTimeoutMs?: number }).requestTimeoutMs;
      return typeof override === 'number' && override > timeoutMs ? override : timeoutMs;
    };

    let timer: NodeJS.Timeout;
    const schedule = () => {
      const remaining = Math.max(0, effectiveTimeout() - (Date.now() - startedAt));
      timer = setTimeout(() => {
        if (Date.now() - startedAt < effectiveTimeout()) {
          schedule(); // budget was extended mid-flight — keep waiting
        } else if (!res.headersSent && !res.writableEnded) {
          next(new AppError(503, 'Request timed out'));
        }
      }, remaining);
    };
    schedule();

    // Never fire after the response has already been sent.
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

/**
 * Route-level helper: extends the request budget for routes that legitimately
 * need more than the global timeout (e.g. OCR + AI pipelines, video processing).
 * Place it BEFORE the route handler so the extended budget also covers uploads.
 * The override is only honored when larger than the global default.
 */
export function extendTimeout(ms: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.locals.requestTimeoutMs = ms;
    next();
  };
}
