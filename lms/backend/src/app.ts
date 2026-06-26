import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { securityHeaders } from './middlewares/securityHeaders.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimit } from './middlewares/rateLimit.middleware';
import routes from './routes/index';
import { logger } from './utils/logger';

const app = express();
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
app.use('/', apiRateLimit, routes);

app.use(errorHandler);

export default app;
