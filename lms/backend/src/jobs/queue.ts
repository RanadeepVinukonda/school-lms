import { env } from '../config/env';
import { logger } from '../utils/logger';

const hasRedis = !!env.REDIS_URL;

let uploadQueue: any = null;
let addUploadJob: (textbookId: string, storagePath: string) => Promise<void>;

if (hasRedis) {
  const { Queue, FlowProducer } = require('bullmq');
  const { getRedisConnection } = require('../config/redis');
  const connection = getRedisConnection();

  uploadQueue = new Queue('uploadQueue', { connection });

  const chapterQueue = new Queue('chapterQueue', { connection });
  const conceptQueue = new Queue('conceptQueue', { connection });
  const questionQueue = new Queue('questionQueue', { connection });
  const videoQueue = new Queue('videoQueue', { connection });
  const resourceQueue = new Queue('resourceQueue', { connection });
  const embeddingQueue = new Queue('embeddingQueue', { connection });

  const flowProducer = new FlowProducer({ connection });

  logger.info('BullMQ Queues and FlowProducer initialized successfully.');

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
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
  };
} else {
  logger.info('No REDIS_URL configured — BullMQ queues disabled');
  addUploadJob = async function (_textbookId: string, _storagePath: string) {
    logger.info('BullMQ not available (no Redis), skipping job');
  };
}

export { addUploadJob };
export { uploadQueue };
