import { env } from '../config/env';
import { logger } from '../utils/logger';

let boss: any = null;
let bossReady = false;

async function getBoss() {
  if (bossReady) return boss;
  if (!env.DATABASE_URL) return null;
  try {
    const PgBoss = require('pg-boss');
    boss = new PgBoss(env.DATABASE_URL);
    await boss.start();
    bossReady = true;
    logger.info('pg-boss started');
    return boss;
  } catch (err) {
    logger.error('pg-boss failed to start, falling back to inline processing', { err });
    return null;
  }
}

export async function addUploadJob(textbookId: string, storagePath: string) {
  const b = await getBoss();
  if (!b) {
    logger.info('pg-boss not available, throwing so caller triggers inline processing.', { textbookId });
    throw new Error('pg-boss not available');
  }
  await b.send('uploadQueue', { textbookId, storagePath }, {
    jobId: `upload_${textbookId}`,
    retryLimit: 3,
    retryDelay: 5,
    onComplete: true,
  });
  logger.info('Upload job sent to pg-boss', { textbookId });
}

export async function removeUploadJob(textbookId: string) {
  const b = await getBoss();
  if (!b) return;
  await b.cancel('uploadQueue', `upload_${textbookId}`);
  logger.info('Upload job cancelled', { textbookId });
}

export async function addMasteryJob(studentId: string, conceptId: string, accuracy: number): Promise<boolean> {
  const b = await getBoss();
  if (!b) {
    logger.info('pg-boss not available, skipping job send. Mastery will process inline.', { studentId, conceptId });
    return false;
  }
  await b.send('masteryQueue', { studentId, conceptId, accuracy }, {
    retryLimit: 3,
    retryDelay: 5,
  });
  logger.info('Mastery job sent to pg-boss', { studentId, conceptId });
  return true;
}

export async function stopBoss(): Promise<void> {
  if (boss && bossReady) {
    await boss.stop();
    bossReady = false;
    logger.info('pg-boss stopped');
  }
}

export { getBoss };
