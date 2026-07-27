import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { corsOptions } from './config/cors';
import { nonce } from './middlewares/nonce.middleware';
import { securityHeaders } from './middlewares/securityHeaders.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimit, authRateLimit } from './middlewares/rateLimit.middleware';
import rateLimit from 'express-rate-limit';
import { sanitizeInput } from './middlewares/sanitize.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { csrfProtection, csrfTokenHandler } from './middlewares/csrf.middleware';
import { timeoutMiddleware } from './middlewares/timeout.middleware';
import { requireAcceptJson } from './middlewares/accept-header.middleware';
import { academicYearMiddleware } from './middlewares/academicYear.middleware';
import { idempotency } from './middlewares/idempotency.middleware';
import { sentryMiddleware } from './middlewares/sentry.middleware';
import { cacheControlMiddleware } from './middlewares/cache-control.middleware';
import crypto from 'crypto';
import { logger } from './utils/logger';
import { inngest } from './jobs/inngest/client';
import { serve } from 'inngest/express';
import { textbookPipeline } from './jobs/inngest/functions/textbook-pipeline';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import healthRoute from './routes/health.routes';
import routes from './routes/index';
import gdprRoutes from './routes/gdpr.routes';
const app = express();
app.set('trust proxy', 1);

app.use(sentryMiddleware);
app.use(compression());
app.use(requestId);
app.use(nonce);
app.use(securityHeaders);
app.use(cors(corsOptions));

app.use('/api/inngest', serve({ client: inngest, functions: [textbookPipeline] }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 100 }));
app.use(metricsMiddleware);
app.use(timeoutMiddleware());

// Strip /api prefix — Vercel rewrite adds /api, must strip BEFORE route matching
app.use((req, _res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  next();
});

const healthRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/health', healthRateLimit, healthRoute);

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

if (env.API_DOCS_ENABLED) {
  if (env.NODE_ENV === 'production' && env.API_DOCS_USERNAME && env.API_DOCS_PASSWORD) {
    app.use('/api-docs', (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
        const [user, pass] = decoded.split(':');
        if (user === env.API_DOCS_USERNAME && safeCompare(pass, env.API_DOCS_PASSWORD!)) {
          return next();
        }
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
      res.status(401).json({ success: false, error: { message: 'Authentication required for API docs' } });
    });
  }
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.use(requireAcceptJson);
app.use(sanitizeInput);
app.use(cacheControlMiddleware);
if (process.env.NODE_ENV !== 'test') {
  app.use(csrfProtection);
  app.get('/csrf-token', csrfTokenHandler);
  app.use(idempotency);
}

app.use('/auth', authRateLimit);
app.use('/', apiRateLimit, academicYearMiddleware, auditMiddleware, routes);
app.use('/api/v1', apiRateLimit, academicYearMiddleware, auditMiddleware, routes);
app.use('/user', gdprRoutes);

app.get('/', (_req, res) => {
  res.json({ success: true, status: 'ok', message: 'School LMS API is running.' });
});

// 404 catch-all — must come after all routes
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

app.use(errorHandler);

process.on('unhandledRejection', (reason: unknown) => {
  try {
    const Sentry = require('@sentry/node');
    Sentry.captureException(reason);
  } catch {}
  logger.error('Unhandled rejection', { reason });
});

export default app;
