import { env } from '../config/env';
import { logger } from '../utils/logger';

const hasRedis = !!env.REDIS_URL;

let uploadQueue: any = null;
let conceptQueue: any = null;
let addUploadJob: (textbookId: string, storagePath: string) => Promise<void>;
let removeUploadJob: (textbookId: string) => Promise<void>;

if (hasRedis) {
  const { Queue } = require('bullmq');
  const { getRedisConnection } = require('../config/redis');
  const connection = getRedisConnection();

  uploadQueue = new Queue('uploadQueue', { connection });
  conceptQueue = new Queue('conceptQueue', { connection });

  logger.info('BullMQ queues initialized: uploadQueue, conceptQueue');

  addUploadJob = async function (textbookId: string, storagePath: string) {
    logger.info('Adding upload job to queue', { textbookId, storagePath });
    await uploadQueue.add(
      'process-pdf',
      { textbookId, storagePath },
      {
        jobId: `upload_${textbookId}`,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
  };

  removeUploadJob = async function (textbookId: string) {
    const jobId = `upload_${textbookId}`;
    const job = await uploadQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Removed upload job from queue', { textbookId });
    }
  };
} else {
  logger.info('No REDIS_URL configured — BullMQ queues disabled');
  addUploadJob = async function (_textbookId: string, _storagePath: string) {
    logger.info('BullMQ not available (no Redis), skipping job');
  };
  removeUploadJob = async function (_textbookId: string) {
    // noop
  };
}

export { addUploadJob, removeUploadJob, uploadQueue, conceptQueue };
