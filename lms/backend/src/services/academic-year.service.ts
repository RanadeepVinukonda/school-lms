import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TransactionManager } from '../database/transaction-manager';

async function nosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseClient()!;
  const { data } = await supabase.from('nosql_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  return data || null;
}

async function setNosqlDoc(collection: string, docId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const now = new Date().toISOString();
  await supabase.from('nosql_docs').upsert({ collection, doc_id: docId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
}

export async function createAcademicYear(data: {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  status?: string;
}) {
  const supabase = getSupabaseClient()!;

  const { data: existing } = await supabase.from('nosql_docs').select('doc_id')
    .eq('collection', 'academicYears').contains('data', { code: data.code }).maybeSingle();
  if (existing) throw new ConflictError('Academic year with this code already exists');

  const id = uuidv4();
  const now = new Date().toISOString();

  if (data.isCurrent) {
    const { data: prevRows } = await supabase.from('nosql_docs').select('doc_id, data')
      .eq('collection', 'academicYears').contains('data', { isCurrent: true });
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

export async function updateAcademicYear(id: string, data: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');

  if (data.isCurrent === true) {
    const now = new Date().toISOString();
    const { data: prevRows } = await supabase.from('nosql_docs').select('doc_id, data')
      .eq('collection', 'academicYears').contains('data', { isCurrent: true });
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
  const supabase = getSupabaseClient()!;
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');
  await supabase.from('nosql_docs').delete().eq('collection', 'academicYears').eq('doc_id', id);
  logger.info('Academic year deleted', { id });
}

export async function getAcademicYearById(id: string) {
  const existing = await nosqlDoc('academicYears', id);
  if (!existing) throw new NotFoundError('Academic year not found');
  return { ...(existing.data as Record<string, unknown>) };
}

export async function listAcademicYears(query: { status?: string; page?: string; limit?: string }) {
  const supabase = getSupabaseClient()!;
  let dbQuery = supabase.from('nosql_docs').select('doc_id, data').eq('collection', 'academicYears');
  if (query.status) dbQuery = dbQuery.contains('data', { status: query.status });

  const { data: rows } = await dbQuery.order('data->>createdAt', { ascending: false });
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
  const supabase = getSupabaseClient()!;
  const { data: rows } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'academicYears')
    .contains('data', { isCurrent: true, status: 'active' })
    .limit(1);

  if (!rows || rows.length === 0) return null;
  return { ...rows[0].data as Record<string, unknown> };
}
