import { logger } from '../utils/logger';
import { runUploadPipeline } from '../jobs/worker';
import { getSupabaseAdmin } from './supabase';

export async function processUploadInline(textbookId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const { data: doc } = await supabase.from('textbooks').select('storage_path').eq('id', textbookId).single();
  if (!doc) throw new Error('Textbook not found');

  const storagePath = doc.storage_path;
  if (!storagePath) throw new Error('No storage path found');

  logger.info('processUploadInline: Starting inline pipeline', { textbookId });
  await runUploadPipeline(textbookId, storagePath);
}
