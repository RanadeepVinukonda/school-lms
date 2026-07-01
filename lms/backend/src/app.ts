import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { securityHeaders } from './middlewares/securityHeaders.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimit } from './middlewares/rateLimit.middleware';
import { sanitizeInput } from './middlewares/sanitize.middleware';
import { auditMiddleware } from './middlewares/audit.middleware';
import { requestId } from './middlewares/requestId.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import routes from './routes/index';
import { logger } from './utils/logger';

const app = express();
app.set('trust proxy', 1);

app.use(requestId);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(metricsMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }));
}

// Strip /api prefix — Vercel rewrite preserves original URL with /api prefix
app.use((req, _res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  next();
});
app.use(sanitizeInput);
app.use('/', apiRateLimit, auditMiddleware, routes);

app.use(errorHandler);

export default app;
