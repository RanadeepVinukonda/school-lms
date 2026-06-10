import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';

/** Create a textbook. Enforces:
 *  - Rule 2: One textbook per (class × subject)
 *  - Rule 3: Teacher can only upload for their assigned subject+class
 */
export async function createTextbook(data: {
  title: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  description?: string;
  coverImage?: string;
}) {
  // Rule 3: Verify the teacher is assigned to this class+subject
  const assignment = await getTeacherAssignment(data.teacherId, data.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }
  if (assignment.subjectId !== data.subjectId) {
    throw new ForbiddenError('You can only upload textbooks for your assigned subject in this class');
  }

  // Rule 2: Check if a textbook already exists for this class+subject
  const existing = await collections.textbooks()
    .where('classId', '==', data.classId)
    .where('subjectId', '==', data.subjectId)
    .get();

  if (!existing.empty) {
    throw new ConflictError('A textbook already exists for this class and subject. Remove it first to upload a new one.');
  }

  const textbookId = uuidv4();
  const now = new Date().toISOString();

  const textbookData = {
    id: textbookId,
    title: data.title,
    subjectId: data.subjectId,
    classId: data.classId,
    teacherId: data.teacherId,
    description: data.description || '',
    coverImage: data.coverImage || '',
    status: 'ready',
    chapterCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.textbooks().doc(textbookId).set(textbookData);

  // Update the teacher-class-subject record with textbookId
  if (assignment.id) {
    await collections.teacherClassSubject().doc(assignment.id).update({
      textbookId,
      updatedAt: now,
    });
  }

  logger.info('Textbook created', { textbookId, title: data.title, classId: data.classId, subjectId: data.subjectId });

  return textbookData;
}

/** Get textbooks for a class+subject. */
export async function getTextbooksByClassAndSubject(classId: string, subjectId: string) {
  const snap = await collections.textbooks()
    .where('classId', '==', classId)
    .where('subjectId', '==', subjectId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get a single textbook. */
export async function getTextbookById(textbookId: string) {
  const doc = await collections.textbooks().doc(textbookId).get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  return { id: doc.id, ...doc.data() };
}

/** Delete a textbook. */
export async function deleteTextbook(textbookId: string) {
  const ref = collections.textbooks().doc(textbookId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Textbook not found');
  await ref.delete();
  logger.info('Textbook deleted', { textbookId });
}
