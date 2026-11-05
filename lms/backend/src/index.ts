import type { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { initTracing } from './config/tracing';
import { logger } from './utils/logger';
import { startScheduler, stopScheduler } from './jobs/scheduler';
import { closeConnectionPool } from './database/connection-manager';

initTracing();

let server: Server | undefined;

function startServer() {
  try {
    server = app.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
      logger.info(`Inngest serve: http://localhost:${env.PORT}/api/inngest`);

      // Start scheduled jobs (sendReminders, cleanupExpired, overdueTests, etc.)
      startScheduler().catch((err) => logger.error('Scheduler start failed', err));
    });
  } catch (error) {
    logger.error('Failed to start server', error as Record<string, unknown>);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  if (error.message.includes('Release called on client which has already been released')) {
    return;
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', {
    message: reason instanceof Error ? reason.message : 'Unknown rejection',
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await stopScheduler().catch((err) => logger.error('Scheduler stop failed', err));
  await closeConnectionPool().catch((err) => logger.error('Pool drain failed', err));
  if (server) {
    server.close(() => {
      logger.info('Http server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
