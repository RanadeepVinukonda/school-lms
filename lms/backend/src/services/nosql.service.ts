import { getSupabaseAdmin } from './supabase';
import { deleteDocument } from './document.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const COLLECTION = 'firestore_docs';

function requireAdmin() {
  const s = getSupabaseAdmin();
  if (!s) throw new AppError(500, 'Supabase admin not configured');
  return s;
}

export async function nosqlGet(col: string, id: string): Promise<{ exists: boolean; data: Record<string, unknown> | null }> {
  const { data: row, error } = await requireAdmin().from(COLLECTION).select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  if (error) {
    logger.error('nosqlGet failed', { collection: col, doc_id: id, error: error.message });
    throw new AppError(500, `Database read failed: ${error.message}`);
  }
  return { exists: !!row, data: (row?.data as Record<string, unknown>) ?? null };
}

export async function nosqlSet(col: string, id: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await requireAdmin().from(COLLECTION).upsert({
    collection: col, doc_id: id, data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('nosqlSet failed', { collection: col, doc_id: id, error: error.message });
    throw new AppError(500, `Database write failed: ${error.message}`);
  }
}

export async function nosqlUpdate(col: string, id: string, updates: Record<string, unknown>): Promise<void> {
  const { data: existing } = await requireAdmin().from(COLLECTION).select('data').eq('collection', col).eq('doc_id', id).maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) || {}), ...updates };
  const { error } = await requireAdmin().from(COLLECTION).upsert({
    collection: col, doc_id: id, data: merged,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('nosqlUpdate failed', { collection: col, doc_id: id, error: error.message });
    throw new AppError(500, `Database update failed: ${error.message}`);
  }
}

export async function nosqlDelete(col: string, id: string): Promise<void> {
  await deleteDocument(col, id);
}

export async function nosqlQuery(
  col: string,
  filters: Record<string, unknown> | Array<{ field: string; value: unknown }>,
  options?: { orderBy?: string; orderDir?: 'asc' | 'desc'; limit?: number; offset?: number },
): Promise<Array<{ id: string; [key: string]: unknown }>> {
  let q: any = requireAdmin().from(COLLECTION).select('doc_id, data').eq('collection', col);

  if (Array.isArray(filters)) {
    for (const f of filters) {
      q = q.contains('data', { [f.field]: f.value });
    }
  } else {
    for (const [k, v] of Object.entries(filters)) {
      q = q.contains('data', { [k]: v });
    }
  }

  if (options?.orderBy) {
    q = q.order(options.orderBy === 'createdAt' ? 'created_at' : `data->>${options.orderBy}`, { ascending: options.orderDir !== 'desc' });
  }
  if (options?.limit !== undefined && options?.offset !== undefined) {
    q = q.range(options.offset, options.offset + options.limit - 1);
  } else if (options?.limit !== undefined) {
    q = q.limit(options.limit);
  }

  const { data: rows, error } = await q;
  if (error) {
    logger.error('nosqlQuery failed', { collection: col, filters, error: error.message });
    throw new AppError(500, `Database query failed: ${error.message}`);
  }
  return (rows || []).map((r: { doc_id: string; data: unknown }) => ({ id: r.doc_id, ...(r.data as object) }));
}
