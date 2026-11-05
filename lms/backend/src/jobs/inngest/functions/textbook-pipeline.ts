import { inngest } from '../client';
import { runUploadPipeline } from '../../worker';
import { logger } from '../../../utils/logger';

/**
 * Inngest function: textbook-pipeline
 * Triggered by "textbook/pipeline.start" event.
 * Runs the full PDF extraction → TOC analysis → AI enrichment pipeline.
 */
export const textbookPipeline = inngest.createFunction(
  {
    id: 'textbook-pipeline',
    name: 'Textbook Upload Pipeline',
    retries: 3,
    concurrency: 2,
    triggers: { event: 'textbook/pipeline.start' },
  },
  async ({ event, step }) => {
    const { textbookId, storagePath } = event.data as {
      textbookId: string;
      storagePath: string;
    };

    logger.info('Inngest: textbook pipeline triggered', { textbookId, storagePath });

    await step.run('run-pipeline', async () => {
      await runUploadPipeline(textbookId, storagePath);
    });

    return { textbookId, status: 'completed' };
  },
);
