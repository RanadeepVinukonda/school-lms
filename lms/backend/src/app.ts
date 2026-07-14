import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { nonce } from './middlewares/nonce.middleware';
import { securityHeaders } from './middlewares/securityHeaders.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimit, authRateLimit } from './middlewares/rateLimit.middleware';
import { sanitizeInput } from './middlewares/sanitize.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { csrfProtection, csrfTokenHandler } from './middlewares/csrf.middleware';
import { timeoutMiddleware } from './middlewares/timeout.middleware';
import { academicYearMiddleware } from './middlewares/academicYear.middleware';
import { inngest } from './jobs/inngest/client';
import { serve } from 'inngest/express';
import { textbookPipeline } from './jobs/inngest/functions/textbook-pipeline';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';
import healthRoute from './routes/health';
import routes from './routes/index';
import gdprRoutes from './routes/gdpr';
import { logger } from './utils/logger';

const app = express();
app.set('trust proxy', 1);

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

app.use('/health', healthRoute);

if (env.API_DOCS_ENABLED) {
  if (env.NODE_ENV === 'production' && env.API_DOCS_USERNAME && env.API_DOCS_PASSWORD) {
    app.use('/api-docs', (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
        const [user, pass] = decoded.split(':');
        if (user === env.API_DOCS_USERNAME && pass === env.API_DOCS_PASSWORD) {
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

app.use(sanitizeInput);
if (process.env.NODE_ENV !== 'test') {
  app.use(csrfProtection);
  app.get('/csrf-token', csrfTokenHandler);
}

app.use('/auth', authRateLimit);
app.use('/', apiRateLimit, academicYearMiddleware, auditMiddleware, routes);
app.use('/user', gdprRoutes);

app.get('/', (req, res) => {
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

export default app;
