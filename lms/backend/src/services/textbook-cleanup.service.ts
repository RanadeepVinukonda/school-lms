import { getSupabaseAdmin } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { deleteCloudinaryFile } from './cloudinary.service';
import { logger } from '../utils/logger';

export type PdfCleanupStage =
  | 'uploaded'
  | 'parsing'
  | 'extraction_complete'
  | 'persisted'
  | 'pdf_deleted'
  | 'pdf_delete_failed';

export interface PdfCleanupState {
  stage: PdfCleanupStage;
  attemptedAt: string;
  updatedAt: string;
  attempts: number;
  error?: string | null;
  deletedAt?: string;
  storagePathBackup?: string;
  pdfUrlBackup?: string;
}

const STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET || 'textbooks';

const STAGE_MESSAGES: Record<PdfCleanupStage, string> = {
  uploaded: 'PDF uploaded. Queued for processing.',
  parsing: 'PDF found. Parsing and extracting content...',
  extraction_complete: 'Content extracted. Persisting derived data...',
  persisted: 'Derived content persisted. Cleaning up source PDF...',
  pdf_deleted: 'Source PDF deleted from storage after successful persist.',
  pdf_delete_failed: 'Source PDF cleanup failed. Will retry later.',
};

/**
 * Read the current PDF cleanup state stored inside the textbooks `data` JSONB
 * column. Returns null when no cleanup has been recorded yet.
 */
async function readCleanupState(textbookId: string): Promise<PdfCleanupState | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data: row } = await supabase
    .from('textbooks')
    .select('data, storage_path, pdf_url, status, total_concepts, completed_concepts')
    .eq('id', textbookId)
    .single();
  if (!row) return null;
  const data = (row.data as Record<string, unknown>) || {};
  return (data.pdfCleanup as PdfCleanupState) || null;
}

/**
 * Append a log line to the textbook so the deletion lifecycle is visible to
 * teachers in the UI (same mechanism the worker uses).
 */
async function appendTextbookLog(textbookId: string, message: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const { data: row } = await supabase
      .from('textbooks')
      .select('logs')
      .eq('id', textbookId)
      .single();
    const logs = (row?.logs as string[]) || [];
    logs.push(`[${timestamp}] ${message}`);
    const trimmed = logs.slice(-50);
    await supabase
      .from('textbooks')
      .update({ logs: trimmed, updated_at: new Date().toISOString() })
      .eq('id', textbookId);
  } catch (err) {
    logger.warn('Failed to write textbook cleanup log', { textbookId, err });
  }
}

/**
 * Record a lifecycle stage inside the textbooks `data` JSONB column. This is
 * the idempotent, audit-friendly status log for
 * uploaded → parsing → extraction complete → persisted → pdf deleted.
 */
export async function markTextbookStage(
  textbookId: string,
  stage: PdfCleanupStage,
  extra?: Partial<PdfCleanupState>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const now = new Date().toISOString();
  const existing = (await readCleanupState(textbookId)) as PdfCleanupState | null;
  const next: PdfCleanupState = {
    stage,
    attemptedAt: existing?.attemptedAt || now,
    updatedAt: now,
    attempts: extra?.attempts ?? existing?.attempts ?? 0,
    error: extra?.error ?? null,
    deletedAt: extra?.deletedAt ?? existing?.deletedAt,
    storagePathBackup: extra?.storagePathBackup ?? existing?.storagePathBackup,
    pdfUrlBackup: extra?.pdfUrlBackup ?? existing?.pdfUrlBackup,
  };

  const { data: row } = await supabase
    .from('textbooks')
    .select('data')
    .eq('id', textbookId)
    .single();
  const data = (row?.data as Record<string, unknown>) || {};
  data.pdfCleanup = next;

  const { error } = await supabase
    .from('textbooks')
    .update({ data, updated_at: now })
    .eq('id', textbookId);
  if (error) {
    logger.warn('Failed to mark textbook stage', { textbookId, stage, error: error.message });
    return;
  }

  const message = STAGE_MESSAGES[stage];
  if (message) await appendTextbookLog(textbookId, message);
}

/**
 * Determine whether a textbook has fully persisted all derived content
 * (concepts and everything below them), meaning it is safe to delete the
 * source PDF. Only deletes after extraction AND persistence have succeeded.
 */
async function isPersistComplete(supabase: SupabaseClient, textbookId: string): Promise<boolean> {
  const { data: row } = await supabase
    .from('textbooks')
    .select('status, total_concepts, completed_concepts')
    .eq('id', textbookId)
    .single();
  if (!row) return false;
  if (row.status !== 'ready') return false;
  const total = row.total_concepts ?? 0;
  const completed = row.completed_concepts ?? 0;
  if (total === 0) return true;
  return completed >= total;
}

/**
 * Idempotently delete the source PDF after the pipeline has successfully
 * persisted all derived content.
 *
 * Safety rules:
 * - Never deletes while the pipeline is still processing or has failed.
 * - Only deletes after extraction AND persistence have completed.
 * - Idempotent: no-op once the PDF is already marked deleted.
 * - Retryable: failures are recorded and can be retried by re-invoking.
 */
export async function maybeCleanupPdfAfterPersist(textbookId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const state = await readCleanupState(textbookId);
  if (state?.stage === 'pdf_deleted') return;

  const safe = await isPersistComplete(supabase, textbookId);
  if (!safe) return;

  const { data: row } = await supabase
    .from('textbooks')
    .select('id, storage_path, pdf_url, data')
    .eq('id', textbookId)
    .single();
  if (!row) return;

  const storagePath = state?.storagePathBackup || row.storage_path;
  const pdfUrl = state?.pdfUrlBackup || row.pdf_url;

  const attempts = (state?.attempts ?? 0) + 1;
  const now = new Date().toISOString();

  // If there is no storage reference left (already cleared), treat as done.
  if (!storagePath && !pdfUrl) {
    await markTextbookStage(textbookId, 'pdf_deleted', {
      deletedAt: now,
      storagePathBackup: state?.storagePathBackup,
      pdfUrlBackup: state?.pdfUrlBackup,
    });
    return;
  }

  // Delete the physical file. Best-effort for cloudinary-hosted PDFs,
  // bucket delete for Supabase storage.
  let deleteError: string | null = null;
  try {
    if (storagePath && !storagePath.startsWith('http')) {
      if (pdfUrl && /(res\.)?cloudinary\.com/i.test(pdfUrl)) {
        // Cloudinary-hosted asset: storage_path stores the Cloudinary public id.
        await deleteCloudinaryFile(storagePath);
      } else {
        const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        if (delErr && !/not found/i.test(delErr.message)) deleteError = delErr.message;
      }
    }
  } catch (err) {
    deleteError = err instanceof Error ? err.message : String(err);
  }

  if (deleteError) {
    logger.warn('Source PDF cleanup failed; will retry later', { textbookId, error: deleteError });
    await markTextbookStage(textbookId, 'pdf_delete_failed', {
      attempts,
      error: deleteError,
      storagePathBackup: storagePath || undefined,
      pdfUrlBackup: pdfUrl || undefined,
    });
    return;
  }

  // Clear the DB file record (storage_path / pdf_url) so the row no longer
  // references the removed file. These columns are NOT NULL in production, so
  // empty strings are used (still falsy for downstream `!...` checks).
  // Derived content stays intact.
  const { error: clearErr } = await supabase
    .from('textbooks')
    .update({ storage_path: '', pdf_url: '', updated_at: now })
    .eq('id', textbookId);
  if (clearErr) {
    logger.warn('Failed to clear textbook file record', { textbookId, error: clearErr.message });
    await markTextbookStage(textbookId, 'pdf_delete_failed', {
      attempts,
      error: `File deleted but DB record clear failed: ${clearErr.message}`,
      storagePathBackup: storagePath || undefined,
      pdfUrlBackup: pdfUrl || undefined,
    });
    return;
  }

  logger.info('Source PDF deleted after successful persist', { textbookId });
  await markTextbookStage(textbookId, 'pdf_deleted', {
    attempts,
    deletedAt: now,
    storagePathBackup: storagePath || undefined,
    pdfUrlBackup: pdfUrl || undefined,
  });
}

/**
 * Retry cleanup for textbooks whose PDF cleanup previously failed. Only
 * textbooks that have fully persisted their content are considered.
 */
export async function retryPendingPdfCleanups(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { data: rows, error } = await supabase
    .from('textbooks')
    .select('id')
    .eq('status', 'ready')
    .limit(50);
  if (error) {
    logger.warn('Failed to fetch textbooks for PDF cleanup retry', { error: error.message });
    return;
  }
  for (const row of rows || []) {
    try {
      const state = await readCleanupState(row.id);
      if (state?.stage === 'pdf_deleted') continue;
      if (state?.stage !== 'pdf_delete_failed' && state?.stage !== 'persisted') continue;
      await maybeCleanupPdfAfterPersist(row.id);
    } catch (err) {
      logger.warn('PDF cleanup retry failed', { textbookId: row.id, err });
    }
  }
}
