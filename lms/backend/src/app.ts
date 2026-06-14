import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { securityHeaders } from './middlewares/securityHeaders.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { apiRateLimit } from './middlewares/rateLimit.middleware';
import { initializeFirebase } from './config/firebase';
import routes from './routes/index';
import { logger } from './utils/logger';

initializeFirebase();
console.log("DEBUG_FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("DEBUG_FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("DEBUG_FIREBASE_PRIVATE_KEY_LENGTH:", process.env.FIREBASE_PRIVATE_KEY?.length);
console.log("DEBUG_FIREBASE_WEB_API_KEY:", process.env.FIREBASE_WEB_API_KEY);

const app = express();
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.info(message.trim()) },
  }));
}

app.use('/api', apiRateLimit, routes);

app.use(errorHandler);

export default app;
