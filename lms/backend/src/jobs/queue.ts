import { inngest } from './inngest/client';
import { logger } from '../utils/logger';

/**
 * Submit a textbook upload to Inngest for background processing.
 * Falls back to inline processing if the send fails (e.g. dev without Inngest server).
 */
export async function addUploadJob(textbookId: string, storagePath: string): Promise<void> {
  try {
    await inngest.send({
      name: 'textbook/pipeline.start',
      data: { textbookId, storagePath },
    });
    logger.info('Upload job sent to Inngest', { textbookId });
  } catch (err) {
    logger.warn('Inngest send failed — caller should fall back to inline processing.', {
      textbookId,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
