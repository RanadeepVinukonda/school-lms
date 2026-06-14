import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startScheduler } from './jobs/scheduler';

function startServer() {
  try {
    app.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/health`);

      startScheduler();

      if (env.REDIS_URL && !process.env.VERCEL) {
        logger.info('Initializing background workers...');
        try {
          require('./jobs/worker');
        } catch (err) {
          logger.error('Failed to initialize background workers', err);
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: Error | unknown) => {
  logger.error('Unhandled Rejection', {
    message: reason instanceof Error ? reason.message : 'Unknown rejection',
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
