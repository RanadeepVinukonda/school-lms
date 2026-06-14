import { Queue, FlowProducer } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { logger } from '../utils/logger';

const connection = getRedisConnection();

// Initialize BullMQ Queues
export const uploadQueue = new Queue('uploadQueue', { connection });
export const chapterQueue = new Queue('chapterQueue', { connection });
export const conceptQueue = new Queue('conceptQueue', { connection });
export const questionQueue = new Queue('questionQueue', { connection });
export const videoQueue = new Queue('videoQueue', { connection });
export const resourceQueue = new Queue('resourceQueue', { connection });
export const embeddingQueue = new Queue('embeddingQueue', { connection });

// Set up flow producer to coordinate nested jobs (e.g. parents waiting for children to finish)
export const flowProducer = new FlowProducer({ connection });

logger.info('BullMQ Queues and FlowProducer initialized successfully.');

/**
 * Triggers the textbook processing pipeline by pushing the initial upload job.
 */
export async function addUploadJob(textbookId: string, storagePath: string) {
  logger.info('Adding upload job to queue', { textbookId, storagePath });
  
  // Clean job ID to prevent duplicates
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
}
