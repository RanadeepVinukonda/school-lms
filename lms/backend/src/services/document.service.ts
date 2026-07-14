import { getSupabaseAdmin } from './supabase';

export interface DocumentRecord {
  id: string;
  collection: string;
  doc_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const DOC_TABLE = 'firestore_docs';

export async function getDocument(collection: string, docId: string): Promise<DocumentRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(DOC_TABLE)
    .select('*')
    .eq('collection', collection)
    .eq('doc_id', docId)
    .maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data as DocumentRecord | null;
}

export async function setDocument(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from(DOC_TABLE).upsert({
    collection,
    doc_id: docId,
    data,
    updated_at: now,
  }, {
    onConflict: 'collection,doc_id',
  });
  if (error) throw new Error('Failed to set document: ' + error.message);
}

export async function updateDocument(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabase
    .from(DOC_TABLE)
    .select('data')
    .eq('collection', collection)
    .eq('doc_id', docId)
    .maybeSingle();
  if (fetchErr) throw new Error('Failed to fetch document for update: ' + fetchErr.message);
  const merged = { ...(existing?.data as Record<string, unknown> ?? {}), ...data };
  const { error } = await supabase
    .from(DOC_TABLE)
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq('collection', collection)
    .eq('doc_id', docId);
  if (error) throw new Error('Failed to update document: ' + error.message);
}

export async function deleteDocument(collection: string, docId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(DOC_TABLE)
    .delete()
    .eq('collection', collection)
    .eq('doc_id', docId);
  if (error) throw new Error('Failed to delete document: ' + error.message);
}

export async function hardDeleteDocument(collection: string, docId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from(DOC_TABLE)
    .delete()
    .eq('collection', collection)
    .eq('doc_id', docId);
  if (error) throw new Error('Failed to hard-delete document: ' + error.message);
}

export async function listDocuments(
  collection: string,
  options?: { page?: number; limit?: number },
): Promise<{ items: DocumentRecord[]; total: number }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from(DOC_TABLE)
    .select('*', { count: 'exact' })
    .eq('collection', collection);

  query = query.order('created_at', { ascending: false });

  if (options?.page && options?.limit) {
    const offset = (options.page - 1) * options.limit;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error('Failed to list documents: ' + error.message);

  return {
    items: (data as DocumentRecord[]) || [],
    total: count ?? 0,
  };
}

export async function migrateFromFirestoreDocs(): Promise<{ migrated: number; errors: number }> {
  const supabase = getSupabaseAdmin();

  const { data: sourceDocs, error: fetchErr } = await supabase
    .from('firestore_docs')
    .select('collection, doc_id, data, created_at, updated_at');
  if (fetchErr) throw new Error('Failed to fetch firestore_docs: ' + fetchErr.message);

  let migrated = 0;
  let errors = 0;

  for (const doc of sourceDocs || []) {
    const record = {
      collection: doc.collection,
      doc_id: doc.doc_id,
      data: doc.data ?? {},
      created_at: doc.created_at || new Date().toISOString(),
      updated_at: doc.updated_at || new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from(DOC_TABLE)
      .upsert(record, { onConflict: 'collection,doc_id' });

    if (upsertErr) {
      errors++;
    } else {
      migrated++;
    }
  }

  return { migrated, errors };
}
