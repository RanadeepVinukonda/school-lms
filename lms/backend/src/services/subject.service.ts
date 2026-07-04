import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** Create a new subject within a class. */
export async function createSubject(data: {
  name: string;
  code: string;
  classId: string;
  description?: string;
  category?: string;
  credits?: number;
  department?: string;
  thumbnail?: string;
  isElective?: boolean;
  gradeLevels?: string[];
  tags?: string[];
  syllabus?: string;
  status?: string;
}) {
  if (!data.classId) {
    throw new Error('classId is required when creating a subject');
  }
  
  const supabase = getSupabaseClient()!;
  const subjectId = uuidv4();
  const now = new Date().toISOString();

  const subjectData = {
    id: subjectId,
    name: data.name,
    code: data.code,
    class_id: data.classId,
    description: data.description || '',
    category: data.category,
    credit_hours: data.credits,
    department: data.department,
    icon: data.thumbnail,
    is_elective: data.isElective,
    grade_levels: data.gradeLevels,
    tags: data.tags || [],
    syllabus: data.syllabus,
    status: data.status || 'active',
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from('subjects').insert(subjectData);
  if (error) throw error;

  logger.info('Subject created', { subjectId, name: data.name, code: data.code, classId: data.classId });

  return { ...subjectData, classId: data.classId };
}

/** Update subject fields. Throws NotFoundError if missing. */
export async function updateSubject(subjectId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Subject not found');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    updateData[k] = v;
  }

  const { error } = await supabase.from('subjects').update(updateData).eq('id', subjectId);
  if (error) throw error;

  const { data: updated } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
  logger.info('Subject updated', { subjectId });

  return updated;
}

/** Delete a subject by id. Throws NotFoundError if missing. */
export async function deleteSubject(subjectId: string) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Subject not found');
  }

  const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
  if (error) throw error;

  logger.info('Subject deleted', { subjectId });
}

/** List subjects with optional filters (status, category, department, classId, search), paginated. */
export async function listSubjects(query: {
  page?: string;
  limit?: string;
  status?: string;
  category?: string;
  department?: string;
  classId?: string;
  search?: string;
}) {
  const { page, limit } = parsePagination(query);
  const supabase = getSupabaseClient()!;
  
  let baseQuery = supabase.from('subjects').select('*');

  if (query.status) baseQuery = baseQuery.eq('status', query.status);
  if (query.category) baseQuery = baseQuery.eq('category', query.category);
  if (query.department) baseQuery = baseQuery.eq('department', query.department);
  if (query.classId) baseQuery = baseQuery.eq('class_id', query.classId);

  const { data: items, error } = await baseQuery;
  if (error) throw error;

  let result = items || [];
  result = result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    result = result.filter(
      (item: { name?: string; code?: string }) =>
        item.name?.toLowerCase().includes(search) ||
        item.code?.toLowerCase().includes(search)
    );
  }

  const total = result.length;
  const offset = (page - 1) * limit;
  const paged = result.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** List subjects by class. */
export async function listSubjectsByClass(classId: string) {
  const supabase = getSupabaseClient()!;
  
  const { data: items } = await supabase
    .from('subjects')
    .select('*')
    .eq('class_id', classId);
  
  const sorted = (items || []).sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  return sorted;
}

/** Fetch a single subject by id. Throws NotFoundError if missing. */
export async function getSubjectById(subjectId: string) {
  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('Subject not found');
  }

  return data;
}