import { env } from './env';

export function initTracing(): void {
  if (env.NODE_ENV !== 'production' || !env.SENTRY_DSN) return;

  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1,
      attachStacktrace: true,
      maxValueLength: 1000,
    });
  } catch {
    // Sentry not available — tracing disabled
  }
}
