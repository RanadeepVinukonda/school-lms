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
    logger.info('pg-boss not available, skipping job send. Textbook will process inline.', { textbookId });
    return;
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

export { getBoss };
