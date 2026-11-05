import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors by status code',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpErrorsTotal);

// Business metrics
export const quizCompletionsCounter = new promClient.Counter({
  name: 'lms_quiz_completions_total',
  help: 'Total quiz completions',
  labelNames: ['passed'] as const,
});

export const aiRequestsCounter = new promClient.Counter({
  name: 'lms_ai_requests_total',
  help: 'Total AI requests',
  labelNames: ['provider', 'success'] as const,
});

export const userActionsCounter = new promClient.Counter({
  name: 'lms_user_actions_total',
  help: 'Total user actions',
  labelNames: ['action', 'role'] as const,
});

register.registerMetric(quizCompletionsCounter);
register.registerMetric(aiRequestsCounter);
register.registerMetric(userActionsCounter);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: res.statusCode.toString() };
    httpRequestDuration.observe(labels, (Date.now() - start) / 1000);
    httpRequestTotal.inc(labels);
    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });
  next();
}

export { register, httpRequestDuration, httpRequestTotal, httpErrorsTotal };

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
}
