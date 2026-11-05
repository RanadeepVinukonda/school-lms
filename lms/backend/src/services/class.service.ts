import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { getConnectionPool } from '../database/connection-manager';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { ServiceResult, success, failure } from '../types/service-result';
import { classCache } from '../utils/cache';

/** Create a new class with zero student count. */
export async function createClass(data: {
  name: string;
  code: string;
  description?: string;
  grade?: string;
  section?: string;
  academicYear?: string;
  roomNumber?: string;
  teacherIds?: string[];
  subjectIds?: string[];
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  schoolId?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const classId = uuidv4();
  const now = new Date().toISOString();

  const classData = {
    id: classId,
    name: data.name,
    code: data.code,
    description: data.description || '',
    grade: data.grade,
    section: data.section,
    academic_year: data.academicYear,
    room_number: data.roomNumber,
    teacher_ids: data.teacherIds || [],
    subject_ids: data.subjectIds || [],
    max_students: data.maxStudents,
    start_date: data.startDate,
    end_date: data.endDate,
    status: data.status || 'active',
    student_count: 0,
    created_at: now,
    updated_at: now,
    school_id: data.schoolId || null,
  };

  const { error } = await supabase.from('classes').insert(classData);
  if (error) throw error;

  logger.info('Class created', { classId, name: data.name, code: data.code });
  classCache.invalidate(classId);

  return { ...classData, studentCount: 0 };
}

/** Update class fields. Throws NotFoundError if missing. */
export async function updateClass(classId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchErr } = await supabase
    .from('classes')
    .select('id, version')
    .eq('id', classId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!existing) {
    throw new NotFoundError('Class not found');
  }

  const currentVersion = existing.version ?? 0;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), version: currentVersion + 1 };
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'version') updateData[k] = v;
  }

  const { data: updated, error } = await supabase
    .from('classes')
    .update(updateData)
    .eq('id', classId)
    .eq('version', currentVersion)
    .select()
    .single();
  if (error) throw error;
  if (!updated) throw new Error('Concurrent modification detected. Please retry.');

  logger.info('Class updated', { classId });
  classCache.invalidate(classId);

  return updated;
}

/** Delete a class by id. Throws NotFoundError if missing. */
export async function deleteClass(classId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing, error: fetchErr } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!existing) {
    throw new NotFoundError('Class not found');
  }

  const { error } = await supabase.from('classes').update({ deleted_at: new Date().toISOString() }).eq('id', classId);
  if (error) throw error;

  logger.info('Class deleted', { classId });
  classCache.invalidate(classId);
}

/** List classes with optional filters (status, academicYear, teacherId, search, schoolId), paginated. */
export async function listClasses(query: {
  page?: string;
  limit?: string;
  status?: string;
  teacherId?: string;
  academicYear?: string;
  search?: string;
  schoolId?: string;
}): Promise<ServiceResult<{ items: Record<string, unknown>[]; total: number; page: number; limit: number }>> {
  try {
    const { page, limit } = parsePagination(query);
    const offset = (page - 1) * limit;
    const supabase = getSupabaseAdmin()!;

    let baseQuery = supabase
      .from('classes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (query.schoolId) baseQuery = baseQuery.eq('school_id', query.schoolId);
    if (query.status) baseQuery = baseQuery.eq('status', query.status);
    if (query.academicYear) baseQuery = baseQuery.eq('academic_year', query.academicYear);

    if (query.teacherId) {
      baseQuery = baseQuery.contains('teacher_ids', [query.teacherId]);
    }
    if (query.search) {
      baseQuery = baseQuery.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%`);
    }

    const { data: items, count, error } = await baseQuery.range(offset, offset + limit - 1);
    if (error) return failure(error.message, 'DB_ERROR');

    return success({ items: items || [], total: count || 0, page, limit });
  } catch (err: unknown) {
    return failure(err instanceof Error ? err.message : String(err), 'LIST_CLASSES_ERROR');
  }
}

/**
 * List classes visible to the current user based on their role.
 * - super_admin: all classes across all schools
 * - admin: all classes in the admin's school
 * - teacher: classes the teacher is assigned to (teacher_class_subject assignments,
 *   classes.teacher_ids, or class_ids on their profile)
 * - student: the student's enrolled class(es) (class_id / class_ids)
 * - parent: unique classes of all their children (children_ids)
 * - fallback (unknown roles): class ids on the profile
 */
export async function listMyClassesForUser(user: {
  uid: string;
  role: string;
  classIds?: string[];
  class_id?: string;
  children_ids?: string[];
  school_id?: string;
}): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = getSupabaseAdmin()!;
    const roles = (user.role || '').split(',').map((r) => r.trim());

    let classIds: string[] | null = null;
    let schoolId: string | undefined;

    if (roles.includes('super_admin')) {
      // all classes across all schools
    } else if (roles.includes('admin')) {
      schoolId = user.school_id || undefined;
    } else if (roles.includes('teacher')) {
      const ids = new Set<string>();
      if (user.class_id) ids.add(user.class_id);
      for (const id of user.classIds || []) if (id) ids.add(id);

      const { data: tcsRows, error: tcsErr } = await supabase
        .from('firestore_docs')
        .select('data')
        .eq('collection', 'teacherClassSubject')
        .contains('data', { teacherId: user.uid });
      if (tcsErr) return failure(tcsErr.message, 'DB_ERROR');
      for (const row of tcsRows || []) {
        const cid = (row.data as Record<string, unknown>)?.classId as string | undefined;
        if (cid) ids.add(cid);
      }

      const { data: byTeacherIds, error: tiErr } = await supabase
        .from('classes')
        .select('id')
        .contains('teacher_ids', [user.uid]);
      if (tiErr) return failure(tiErr.message, 'DB_ERROR');
      for (const c of byTeacherIds || []) if (c.id) ids.add(c.id);

      classIds = Array.from(ids);
    } else if (roles.includes('student')) {
      const ids = new Set<string>();
      if (user.class_id) ids.add(user.class_id);
      for (const id of user.classIds || []) if (id) ids.add(id);
      classIds = Array.from(ids);
    } else if (roles.includes('parent')) {
      const ids = new Set<string>();
      const childrenIds = (user.children_ids || []).filter(Boolean);
      if (childrenIds.length > 0) {
        const { data: children, error: chErr } = await supabase
          .from('users')
          .select('class_id, class_ids')
          .in('id', childrenIds);
        if (chErr) return failure(chErr.message, 'DB_ERROR');
        for (const c of children || []) {
          if (c.class_id) ids.add(c.class_id);
          for (const id of (c.class_ids || [])) if (id) ids.add(id);
        }
      }
      classIds = Array.from(ids);
    } else {
      const ids = new Set<string>();
      if (user.class_id) ids.add(user.class_id);
      for (const id of user.classIds || []) if (id) ids.add(id);
      classIds = Array.from(ids);
    }

    if (classIds !== null && classIds.length === 0) return success([]);

    let query = supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: true });
    if (schoolId) query = query.eq('school_id', schoolId);
    if (classIds !== null) query = query.in('id', classIds);
    query = query.limit(500);

    const { data, error } = await query;
    if (error) return failure(error.message, 'DB_ERROR');

    return success((data || []).filter((c: Record<string, unknown>) => !c.deleted_at));
  } catch (err: unknown) {
    return failure(err instanceof Error ? err.message : String(err), 'LIST_MY_CLASSES_ERROR');
  }
}

/** Fetch a single class by id. Throws NotFoundError if missing. */
export async function getClassById(classId: string): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (error) return failure(error.message, 'DB_ERROR');
    if (!data) return failure('Class not found', 'NOT_FOUND');

    return success(data);
  } catch (err: unknown) {
    return failure(err instanceof Error ? err.message : String(err), 'GET_CLASS_ERROR');
  }
}

/** Add students to a class by updating their classIds array. */
export async function addStudents(classId: string, studentIds: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { data: classDoc, error: fetchErr } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!classDoc) throw new NotFoundError('Class not found');

  const pool = getConnectionPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const sid of studentIds) {
      await client.query(
        `UPDATE users
         SET class_ids = CASE
           WHEN $2 = ANY(class_ids) THEN class_ids
           ELSE array_append(class_ids, $2)
         END,
         class_id = $2,
         updated_at = NOW()
         WHERE id = $1`,
        [sid, classId]
      );
    }

    const { rows: classVersion } = await client.query(
      'SELECT version FROM classes WHERE id = $1',
      [classId]
    );
    const currentVersion = (classVersion[0]?.version as number) ?? 0;

    await client.query(
      `UPDATE classes
       SET student_ids = (
         SELECT COALESCE(array_agg(DISTINCT sid), '{}')
         FROM unnest(COALESCE(student_ids, '{}') || $2::text[]) AS sid
       ),
       student_count = (
         SELECT COUNT(DISTINCT sid)
         FROM unnest(COALESCE(student_ids, '{}') || $2::text[]) AS sid
       ),
       version = $3,
       updated_at = NOW()
       WHERE id = $1 AND version = $4`,
      [classId, studentIds, currentVersion + 1, currentVersion]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  logger.info('Students added to class', { classId, count: studentIds.length });
}

/** Remove students from a class by filtering their classIds array. */
export async function removeStudents(classId: string, studentIds: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { data: classDoc, error: fetchErr } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!classDoc) throw new NotFoundError('Class not found');

  const pool = getConnectionPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const sid of studentIds) {
      await client.query(
        `UPDATE users
         SET class_ids = array_remove(class_ids, $2),
             updated_at = NOW()
         WHERE id = $1`,
        [sid, classId]
      );
    }

    const { rows: classVersion } = await client.query(
      'SELECT version FROM classes WHERE id = $1',
      [classId]
    );
    const currentVersion = (classVersion[0]?.version as number) ?? 0;

    await client.query(
      `UPDATE classes
       SET student_ids = (
         SELECT COALESCE(array_agg(DISTINCT sid), '{}')
         FROM unnest(COALESCE(student_ids, '{}')) AS sid
         WHERE sid <> ALL($2::text[])
       ),
       student_count = (
         SELECT COUNT(DISTINCT sid)
         FROM unnest(COALESCE(student_ids, '{}')) AS sid
         WHERE sid <> ALL($2::text[])
       ),
       version = $3,
       updated_at = NOW()
       WHERE id = $1 AND version = $4`,
      [classId, studentIds, currentVersion + 1, currentVersion]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  logger.info('Students removed from class', { classId, count: studentIds.length });
}

/** Get the class roster — all users whose classIds array contains the given classId. Excludes password field. */
export async function getRoster(classId: string) {
  const supabase = getSupabaseAdmin()!;
  
  const { data: snapshot, error } = await supabase
    .from('users')
    .select('id, display_name, email, role, student_id, roll_no, class_ids')
    .overlaps('class_ids', [classId]);
  if (error) throw error;

  return (snapshot || []).map((doc: { id: string; display_name: string; email: string; role: string; student_id: string; roll_no: string; class_ids: string[] }) => ({
    id: doc.id,
    display_name: doc.display_name,
    email: doc.email,
    role: doc.role,
    student_id: doc.student_id,
    roll_no: doc.roll_no,
    class_ids: doc.class_ids,
  }));
}