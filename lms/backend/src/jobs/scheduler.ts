import { logger } from '../utils/logger';
import { checkUpcomingDeadlines } from './sendReminders.job';
import { cleanupExpiredData } from './cleanupExpired.job';

const jobs: Map<string, NodeJS.Timeout> = new Map();

export function startScheduler() {
  logger.info('Starting job scheduler...');

  const reminderJob = setInterval(
    () => {
      checkUpcomingDeadlines().catch((err) =>
        logger.error('Reminder job failed', err)
      );
    },
    30 * 60 * 1000
  );
  jobs.set('sendReminders', reminderJob);

  const cleanupJob = setInterval(
    () => {
      cleanupExpiredData().catch((err) =>
        logger.error('Cleanup job failed', err)
      );
    },
    60 * 60 * 1000
  );
  jobs.set('cleanupExpired', cleanupJob);

  logger.info('Scheduler started with 2 jobs');
}

export function stopScheduler() {
  for (const [name, interval] of jobs.entries()) {
    clearInterval(interval);
    logger.info(`Job ${name} stopped`);
  }
  jobs.clear();
}
