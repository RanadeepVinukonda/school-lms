import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { deleteDocument } from './document.service';
import { TransactionManager } from '../database/transaction-manager';

async function nosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data || null;
}

async function setNosqlDoc(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const now = new Date().toISOString();
  const { error } = await supabase.from('firestore_docs').upsert({ collection, doc_id: docId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw error;
}

/**
 * Create a new academic year. If isCurrent is true, all other current years are unset atomically.
 * @param data.name - Human-readable name (e.g. "2024-25")
 * @param data.code - Unique short code (e.g. "AY2425")
 * @param data.startDate - ISO date string for year start
 * @param data.endDate - ISO date string for year end
 * @param data.isCurrent - Whether to mark this as the active year
 * @returns The created academic year object
 * @throws {ConflictError} if a year with the same code already exists
 */
export async function createAcademicYear(data: {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: string;
}) {
  const supabase = getSupabaseAdmin()!;

  const { data: existing, error: fetchError } = await supabase.from('firestore_docs').select('doc_id')
    .eq('collection', 'academicYears').contains('data', { code: data.code }).maybeSingle();
  if (fetchError) throw new Error('Failed to check existing academic year: ' + fetchError.message);
  if (existing) throw new ConflictError('Academic year with this code already exists');

  const id = uuidv4();
  const now = new Date().toISOString();

  if (data.isCurrent) {
    const { data: prevRows, error: prevError } = await supabase.from('firestore_docs').select('doc_id, data')
      .eq('collection', 'academicYears').contains('data', { isCurrent: true });
    if (prevError) throw new Error('Failed to fetch current academic years: ' + prevError.message);
    const yearData = { ...data, id, status: data.status || 'active', createdAt: now, updatedAt: now };
    const tm = new TransactionManager();
    await tm.runTransaction(async (tx) => {
      for (const d of prevRows || []) {
        const docData = { ...d.data as Record<string, unknown>, isCurrent: false, updatedAt: now };
        tx.update('academicYears', d.doc_id, docData);
      }
      tx.set('academicYears', id, yearData);
    });
    return yearData;
  }

  const yearData = { ...data, id, status: data.status || 'active', createdAt: now, updatedAt: now };
  await setNosqlDoc('academicYears', id, yearData);
  logger.info('Academic year created', { id, name: data.name });
  return yearData;
}

/**
 * Update an academic year's fields. If isCurrent is set to true, other current years are unset.
 * @param id - UUID of the academic year to update
 * @param data - Partial fields to merge into the existing record
 * @throws {NotFoundError} if the year doesn't exist
 */
export async function updateAcademicYear(id: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');

  if (data.isCurrent === true) {
    const now = new Date().toISOString();
    const { data: prevRows, error: prevError } = await supabase.from('firestore_docs').select('doc_id, data')
      .eq('collection', 'academicYears').contains('data', { isCurrent: true });
    if (prevError) throw new Error('Failed to fetch current academic years: ' + prevError.message);
    const tm = new TransactionManager();
    await tm.runTransaction(async (tx) => {
      for (const d of prevRows || []) {
        if (d.doc_id !== id) {
          const docData = { ...d.data as Record<string, unknown>, isCurrent: false, updatedAt: now };
          tx.update('academicYears', d.doc_id, docData);
        }
      }
      const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: now };
      tx.update('academicYears', id, merged);
    });
  } else {
    const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: new Date().toISOString() };
    await setNosqlDoc('academicYears', id, merged);
  }

  const updated = await nosqlDoc('academicYears', id);
  return { ...(updated?.data as Record<string, unknown> || {}) };
}

export async function deleteAcademicYear(id: string) {
  const supabase = getSupabaseAdmin()!;
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');
  await deleteDocument('academicYears', id);
  logger.info('Academic year deleted', { id });
}

export async function getAcademicYearById(id: string) {
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');
  return { ...(existing.data as Record<string, unknown>) };
}

export async function listAcademicYears(query: { status?: string; page?: string; limit?: string }) {
  const supabase = getSupabaseAdmin()!;
  let dbQuery = supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'academicYears');
  if (query.status) dbQuery = dbQuery.contains('data', { status: query.status });

  const { data: rows, error } = await dbQuery.order('data->>createdAt', { ascending: false });
  if (error) throw new Error('Failed to fetch academic years: ' + error.message);
  const items = (rows || []).map((row) => ({ ...row.data as Record<string, unknown>, id: row.doc_id }));
  const total = items.length;

  if (query.page && query.limit) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    return { items: items.slice(offset, offset + limit), total, page, limit };
  }

  return { items, total, page: 1, limit: total };
}

export async function getCurrentAcademicYear() {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'academicYears')
    .contains('data', { isCurrent: true, status: 'active' })
    .limit(1);
  if (error) throw new Error('Failed to fetch current academic year: ' + error.message);

  if (!rows || rows.length === 0) return null;
  return { ...rows[0].data as Record<string, unknown> };
}
