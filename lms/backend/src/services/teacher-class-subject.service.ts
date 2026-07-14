import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ConflictError } from '../utils/errors';
import { deleteDocument } from './document.service';
import { logger } from '../utils/logger';

export interface TeacherClassSubject {
  id?: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  textbookId?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function nosqlDoc(collection: string, docId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data || null;
}

/** Assign a teacher to a (class × subject). Enforces: one teacher per subject per class. */
export async function assignTeacher(data: {
  teacherId: string;
  classId: string;
  subjectId: string;
}): Promise<TeacherClassSubject> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'teacherClassSubject')
    .contains('data', { classId: data.classId, subjectId: data.subjectId });
  if (error) throw new Error('Failed to fetch assignments: ' + error.message);

  if (rows && rows.length > 0) {
    const currentDoc = rows[0];
    const current = currentDoc.data as TeacherClassSubject;
    if (current.teacherId !== data.teacherId) {
      const now = new Date().toISOString();
      const updated = { ...current, teacherId: data.teacherId, updatedAt: now };
      const { error: updateError } = await supabase.from('firestore_docs').update({ data: updated }).eq('collection', 'teacherClassSubject').eq('doc_id', currentDoc.doc_id);
      if (updateError) throw new Error(`Failed to update teacher assignment: ${updateError.message}`);
      return { id: currentDoc.doc_id, ...updated };
    }
    return { id: currentDoc.doc_id, ...current };
  }

  const now = new Date().toISOString();
  const docId = uuidv4();
  const record = {
    teacherId: data.teacherId, classId: data.classId, subjectId: data.subjectId,
    textbookId: undefined, createdAt: now, updatedAt: now,
  };
  const { error: insertError } = await supabase.from('firestore_docs').insert({
    collection: 'teacherClassSubject', doc_id: docId, data: record, updated_at: now,
  });
  if (insertError) throw new Error(`Failed to insert teacher assignment: ${insertError.message}`);

  logger.info('Teacher assigned to subject', {
    teacherId: data.teacherId, classId: data.classId, subjectId: data.subjectId,
  });

  return { id: docId, ...record };
}

/** Get all assignments for a teacher, enriched with class name. */
export async function getTeacherAssignments(teacherId: string): Promise<(TeacherClassSubject & { className: string; subjectName: string })[]> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'teacherClassSubject')
    .contains('data', { teacherId });
  if (error) throw new Error('Failed to fetch teacher assignments: ' + error.message);

  const results = await Promise.all((rows || []).map(async (row) => {
    const data = { id: row.doc_id, ...row.data as Record<string, unknown> } as unknown as TeacherClassSubject;
    let className = '';
    let subjectName = '';
    try {
      const [classRes, subjectRes] = await Promise.all([
        supabase.from('classes').select('*').eq('id', data.classId).maybeSingle(),
        supabase.from('subjects').select('*').eq('id', data.subjectId).maybeSingle(),
      ]);
      if (classRes.data) {
        const c = classRes.data;
        className = `${c.name || ''}${c.section ? ` - ${c.section}` : ''}`.trim() || c.code || data.classId;
      }
      if (subjectRes.data) {
        subjectName = subjectRes.data.name || data.subjectId;
      }
    } catch { /* ignore */ }
    return { ...data, className, subjectName };
  }));
  return results;
}

/** Get the single assignment for a teacher + class. */
export async function getTeacherAssignment(teacherId: string, classId: string): Promise<TeacherClassSubject | null> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'teacherClassSubject')
    .contains('data', { teacherId, classId })
    .limit(1);
  if (error) throw new Error('Failed to fetch teacher assignment: ' + error.message);

  if (!rows || rows.length === 0) return null;
  return { id: rows[0].doc_id, ...rows[0].data as Record<string, unknown> } as unknown as TeacherClassSubject;
}

/** Get unassigned subjects for a class (subjects with no teacher-class-subject record). */
export async function getUnassignedSubjects(classId: string) {
  const supabase = getSupabaseAdmin();
  const { data: subjectsRows, error: subErr } = await supabase.from('subjects').select('*').eq('classId', classId);
  if (subErr) throw new Error('Failed to fetch subjects: ' + subErr.message);
  const { data: assignedRows, error: assignErr } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'teacherClassSubject')
    .contains('data', { classId });
  if (assignErr) throw new Error('Failed to fetch assigned subjects: ' + assignErr.message);

  const assignedSubjectIds = new Set((assignedRows || []).map((r) => (r.data as Record<string, unknown>).subjectId as string));

  return (subjectsRows || [])
    .filter((d) => !assignedSubjectIds.has(d.id))
    .map((d) => ({ id: d.id, ...d }));
}

/** Get all assignments with resolved class/subject/teacher names. */
export async function getAllAssignments() {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'teacherClassSubject');
  if (error) throw new Error('Failed to fetch assignments: ' + error.message);
  const assignments = (rows || []).map((r) => ({ id: r.doc_id, ...r.data as Record<string, unknown> } as unknown as TeacherClassSubject));

  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const classIds = [...new Set(assignments.map((a) => a.classId))];
  const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];

  const [teacherRes, classRes, subjectRes] = await Promise.all([
    Promise.all(teacherIds.map(async (id) => { const { data, error: e } = await supabase.from('users').select('id, display_name').eq('id', id).maybeSingle(); if (e) throw new Error('Failed to fetch user: ' + e.message); return data; })),
    Promise.all(classIds.map(async (id) => { const { data, error: e } = await supabase.from('classes').select('id, name, section').eq('id', id).maybeSingle(); if (e) throw new Error('Failed to fetch class: ' + e.message); return data; })),
    Promise.all(subjectIds.map(async (id) => { const { data, error: e } = await supabase.from('subjects').select('id, name').eq('id', id).maybeSingle(); if (e) throw new Error('Failed to fetch subject: ' + e.message); return data; })),
  ]);

  const teacherMap = new Map(teacherRes.filter(Boolean).map((s) => [s!.id, s!.display_name || s!.id]));
  const classMap = new Map(classRes.filter(Boolean).map((s) => [s!.id, `${s!.name || ''}${(s as any).section ? ` - ${(s as any).section}` : ''}`.trim() || s!.id]));
  const subjectMap = new Map(subjectRes.filter(Boolean).map((s) => [s!.id, s!.name || s!.id]));

  return assignments.map((a) => ({
    ...a,
    teacherName: teacherMap.get(a.teacherId) || 'Unknown',
    className: classMap.get(a.classId) || 'Unknown',
    subjectName: subjectMap.get(a.subjectId) || 'Unknown',
  }));
}

/** Remove a teacher-class-subject assignment. */
export async function removeAssignment(assignmentId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('doc_id')
    .eq('collection', 'teacherClassSubject').eq('doc_id', assignmentId).maybeSingle();
  if (error) throw new Error('Failed to fetch assignment: ' + error.message);
  if (!data) throw new NotFoundError('Assignment not found');
  await deleteDocument('teacherClassSubject', assignmentId);
  logger.info('Teacher-class-subject assignment removed', { assignmentId });
}
