import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

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
  const supabase = getSupabaseClient()!;
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

  return { ...classData, studentCount: 0 };
}

/** Update class fields. Throws NotFoundError if missing. */
export async function updateClass(classId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Class not found');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    updateData[k] = v;
  }

  const { error } = await supabase.from('classes').update(updateData).eq('id', classId);
  if (error) throw error;

  const { data: updated } = await supabase.from('classes').select('*').eq('id', classId).single();
  logger.info('Class updated', { classId });

  return updated;
}

/** Delete a class by id. Throws NotFoundError if missing. */
export async function deleteClass(classId: string) {
  const supabase = getSupabaseClient()!;
  const { data: existing } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();

  if (!existing) {
    throw new NotFoundError('Class not found');
  }

  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw error;

  logger.info('Class deleted', { classId });
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
}) {
  const { page, limit } = parsePagination(query);
  const supabase = getSupabaseClient()!;
  
  let baseQuery = supabase.from('classes').select('*');

  if (query.schoolId) baseQuery = baseQuery.eq('school_id', query.schoolId);
  if (query.status) baseQuery = baseQuery.eq('status', query.status);
  if (query.academicYear) baseQuery = baseQuery.eq('academic_year', query.academicYear);

  const { data: items, error } = await baseQuery;
  if (error) throw error;

  let result = items || [];
  result = result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (query.teacherId) {
    result = result.filter((item: { teacher_ids?: string[] }) =>
      item.teacher_ids?.includes(query.teacherId!)
    );
  }

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

/** Fetch a single class by id. Throws NotFoundError if missing. */
export async function getClassById(classId: string) {
  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .maybeSingle();

  if (error || !data) {
    throw new NotFoundError('Class not found');
  }

  return data;
}

/** Add students to a class by updating their classIds array. */
export async function addStudents(classId: string, studentIds: string[]) {
  const supabase = getSupabaseClient()!;
  const { data: classDoc } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();

  if (!classDoc) {
    throw new NotFoundError('Class not found');
  }

  for (const studentId of studentIds) {
    const { data: userDoc } = await supabase
      .from('users')
      .select('id, class_ids')
      .eq('id', studentId)
      .maybeSingle();

    if (userDoc) {
      const classIds = userDoc.class_ids || [];
      if (!classIds.includes(classId)) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ class_ids: [...classIds, classId], class_id: classId, updated_at: new Date().toISOString() })
          .eq('id', studentId);
        if (updateError) throw updateError;
      }
    }
  }

  const { data: currentClass } = await supabase.from('classes').select('student_ids').eq('id', classId).single();
  const currentStudentIds = currentClass?.student_ids || [];
  const newStudentIds = [...new Set([...currentStudentIds, ...studentIds])];
  
  const { error } = await supabase.from('classes').update({
    student_ids: newStudentIds,
    student_count: newStudentIds.length,
    updated_at: new Date().toISOString(),
  }).eq('id', classId);
  
  if (error) throw error;

  logger.info('Students added to class', { classId, count: studentIds.length });
}

/** Remove students from a class by filtering their classIds array. */
export async function removeStudents(classId: string, studentIds: string[]) {
  const supabase = getSupabaseClient()!;
  const { data: classDoc } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .maybeSingle();

  if (!classDoc) {
    throw new NotFoundError('Class not found');
  }

  for (const studentId of studentIds) {
    const { data: userDoc } = await supabase
      .from('users')
      .select('id, class_ids')
      .eq('id', studentId)
      .maybeSingle();

    if (userDoc) {
      const newClassIds = (userDoc.class_ids || []).filter((id: string) => id !== classId);
      await supabase.from('users').update({ class_ids: newClassIds }).eq('id', studentId);
    }
  }

  logger.info('Students removed from class', { classId, count: studentIds.length });
}

/** Get the class roster — all users whose classIds array contains the given classId. Excludes password field. */
export async function getRoster(classId: string) {
  const supabase = getSupabaseClient()!;
  
  const { data: snapshot } = await supabase
    .from('users')
    .select('id, display_name, email, role, student_id, roll_no, class_ids')
    .overlaps('class_ids', [classId]);

  return (snapshot || []).map((doc: any) => ({
    id: doc.id,
    display_name: doc.display_name,
    email: doc.email,
    role: doc.role,
    student_id: doc.student_id,
    roll_no: doc.roll_no,
    class_ids: doc.class_ids,
  }));
}