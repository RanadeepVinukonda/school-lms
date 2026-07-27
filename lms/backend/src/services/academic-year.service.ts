import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { deleteDocument } from './document.service';
import { deriveAcademicYear } from '../middlewares/academicYear.middleware';

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
    for (const d of prevRows || []) {
      await setNosqlDoc('academicYears', d.doc_id, { ...d.data as Record<string, unknown>, isCurrent: false, updatedAt: now });
    }
    await setNosqlDoc('academicYears', id, yearData);
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
    for (const d of prevRows || []) {
      if (d.doc_id !== id) {
        await setNosqlDoc('academicYears', d.doc_id, { ...d.data as Record<string, unknown>, isCurrent: false, updatedAt: now });
      }
    }
    const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: now };
    await setNosqlDoc('academicYears', id, merged);
  } else {
    const merged = { ...existing.data as Record<string, unknown>, ...data, updatedAt: new Date().toISOString() };
    await setNosqlDoc('academicYears', id, merged);
  }

  const updated = await nosqlDoc('academicYears', id);
  return { ...(updated?.data as Record<string, unknown> || {}) };
}

export async function deleteAcademicYear(id: string) {
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

export function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const name = `${year}-${year + 1}`;
  return { name, startDate: `${year}-07-01`, endDate: `${year + 1}-06-30`, isCurrent: true, status: 'active' };
}

/**
 * Promote all students to the next class and graduate the highest class students.
 * - Each student moves from Class N to Class N+1
 * - Students in the highest class are marked as graduated (role → 'alumni')
 * - All classes get updated academic_year
 */
export async function promoteAllStudents(): Promise<{ promoted: number; graduated: number }> {
  const supabase = getSupabaseAdmin()!;
  const newYear = deriveAcademicYear();
  let promoted = 0;
  let graduated = 0;

  // 1. Get all classes sorted by grade ascending
  const { data: classes, error: clsErr } = await supabase
    .from('classes')
    .select('id, grade, section, academic_year')
    .order('grade', { ascending: true });
  if (clsErr) throw new Error('Failed to fetch classes: ' + clsErr.message);
  if (!classes || classes.length === 0) return { promoted: 0, graduated: 0 };

  // 2. Find the highest grade
  const maxGrade = Math.max(...classes.map((c) => Number(c.grade) || 0));

  // 3. Build a grade → next classId map
  const gradeToClass: Record<number, string> = {};
  for (const cls of classes) {
    const g = Number(cls.grade) || 0;
    gradeToClass[g] = cls.id;
  }

  // 4. For each student, promote or graduate
  const { data: students, error: stuErr } = await supabase
    .from('users')
    .select('id, class_id, role, grade')
    .eq('role', 'student');
  if (stuErr) throw new Error('Failed to fetch students: ' + stuErr.message);

  for (const student of students || []) {
    const currentGrade = Number(student.grade) || 0;

    if (currentGrade >= maxGrade) {
      // Graduate: mark as alumni
      const { error } = await supabase
        .from('users')
        .update({ role: 'alumni', updated_at: new Date().toISOString() })
        .eq('id', student.id);
      if (!error) graduated++;
    } else {
      // Promote: move to next grade's class
      const nextGrade = currentGrade + 1;
      const nextClassId = gradeToClass[nextGrade];
      if (nextClassId) {
        const { error } = await supabase
          .from('users')
          .update({
            class_id: nextClassId,
            grade: nextGrade,
            academic_year: newYear,
            updated_at: new Date().toISOString(),
          })
          .eq('id', student.id);
        if (!error) promoted++;
      }
    }
  }

  // 5. Update all classes' academic_year to new year
  await supabase
    .from('classes')
    .update({ academic_year: newYear, updated_at: new Date().toISOString() })
    .neq('id', '');

  logger.info('Students promoted', { promoted, graduated, newYear });
  return { promoted, graduated };
}
