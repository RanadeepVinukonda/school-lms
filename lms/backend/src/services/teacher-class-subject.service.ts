import { collections } from '../firebase/firestore';
import { NotFoundError, ConflictError } from '../utils/errors';
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

/** Assign a teacher to a (class × subject). Enforces: one teacher per subject per class. */
export async function assignTeacher(data: {
  teacherId: string;
  classId: string;
  subjectId: string;
}): Promise<TeacherClassSubject> {
  // Rule 1: Check if this subject already has a teacher in this class
  const existing = await collections.teacherClassSubject()
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .get();

  if (!existing.empty) {
    const current = existing.docs[0].data() as TeacherClassSubject;
    if (current.teacherId !== data.teacherId) {
      throw new ConflictError('This subject already has a teacher assigned in this class');
    }
    return { id: existing.docs[0].id, ...current };
  }

  const now = new Date().toISOString();
  const docRef = await collections.teacherClassSubject().add({
    teacherId: data.teacherId,
    classId: data.classId,
    subjectId: data.subjectId,
    textbookId: null,
    createdAt: now,
    updatedAt: now,
  });

  logger.info('Teacher assigned to subject', {
    teacherId: data.teacherId,
    classId: data.classId,
    subjectId: data.subjectId,
  });

  return {
    id: docRef.id,
    teacherId: data.teacherId,
    classId: data.classId,
    subjectId: data.subjectId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Get all assignments for a teacher. */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherClassSubject[]> {
  const snap = await collections.teacherClassSubject()
    .where('teacherId', '==', teacherId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassSubject));
}

/** Get the single assignment for a teacher + class. */
export async function getTeacherAssignment(teacherId: string, classId: string): Promise<TeacherClassSubject | null> {
  const snap = await collections.teacherClassSubject()
    .where('teacherId', '==', teacherId)
    .where('classId', '==', classId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as TeacherClassSubject;
}

/** Get unassigned subjects for a class (subjects with no teacher-class-subject record). */
export async function getUnassignedSubjects(classId: string) {
  const subjectsSnap = await collections.subjects()
    .where('classId', '==', classId)
    .get();
  const assignedSnap = await collections.teacherClassSubject()
    .where('classId', '==', classId)
    .get();

  const assignedSubjectIds = new Set(assignedSnap.docs.map((d) => d.data().subjectId));

  return subjectsSnap.docs
    .filter((d) => !assignedSubjectIds.has(d.id))
    .map((d) => ({ id: d.id, ...d.data() }));
}

/** Get all assignments with resolved class/subject/teacher names. */
export async function getAllAssignments() {
  const snap = await collections.teacherClassSubject().get();
  const assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherClassSubject));

  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const classIds = [...new Set(assignments.map((a) => a.classId))];
  const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];

  const [teacherSnap, classSnap, subjectSnap] = await Promise.all([
    Promise.all(teacherIds.map((id) => collections.users().doc(id).get().catch(() => null))),
    Promise.all(classIds.map((id) => collections.classes().doc(id).get().catch(() => null))),
    Promise.all(subjectIds.map((id) => collections.subjects().doc(id).get().catch(() => null))),
  ]);

  const teacherMap = new Map(teacherSnap.filter(Boolean).map((s) => [s!.id, s!.data()?.displayName || s!.id]));
  const classMap = new Map(classSnap.filter(Boolean).map((s) => [s!.id, s!.data()?.name || s!.id]));
  const subjectMap = new Map(subjectSnap.filter(Boolean).map((s) => [s!.id, s!.data()?.name || s!.id]));

  return assignments.map((a) => ({
    ...a,
    teacherName: teacherMap.get(a.teacherId) || 'Unknown',
    className: classMap.get(a.classId) || 'Unknown',
    subjectName: subjectMap.get(a.subjectId) || 'Unknown',
  }));
}

/** Remove a teacher-class-subject assignment. */
export async function removeAssignment(assignmentId: string) {
  const ref = collections.teacherClassSubject().doc(assignmentId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Assignment not found');
  await ref.delete();
  logger.info('Teacher-class-subject assignment removed', { assignmentId });
}
