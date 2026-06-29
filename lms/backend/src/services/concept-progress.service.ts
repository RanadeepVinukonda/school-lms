import { collections } from '../database/adapter';
import { logger } from '../utils/logger';

export interface ConceptProgress {
  id: string;
  conceptId: string;
  textbookId: string;
  chapterId: string;
  classId: string;
  teacherId: string;
  completed: boolean;
  updatedAt: string;
}

/** Toggle concept completion status for a teacher-class combination. */
export async function toggleConceptCompletion(data: {
  conceptId: string;
  textbookId: string;
  chapterId: string;
  classId: string;
  teacherId: string;
}): Promise<ConceptProgress> {
  const { conceptId, textbookId, chapterId, classId, teacherId } = data;

  // Check if progress record exists
  const existing = await collections.conceptReleases()
    .where('concept_id', '==', conceptId)
    .where('class_id', '==', classId)
    .where('teacher_id', '==', teacherId)
    .get();

  const now = new Date().toISOString();

  if (existing.docs.length > 0) {
    const doc = existing.docs[0];
    const current = doc.data();
    const newCompleted = !current.completed;
    await doc.ref.update({ completed: newCompleted, updated_at: now });
    logger.info('Concept completion toggled', { conceptId, classId, teacherId, completed: newCompleted });
    return {
      id: doc.id,
      conceptId,
      textbookId,
      chapterId,
      classId,
      teacherId,
      completed: newCompleted,
      updatedAt: now,
    };
  }

  // Create new progress record
  const id = `${conceptId}_${classId}_${teacherId}`;
  const progressData = {
    id,
    concept_id: conceptId,
    textbook_id: textbookId,
    chapter_id: chapterId,
    class_id: classId,
    teacher_id: teacherId,
    completed: true,
    updated_at: now,
  };
  await collections.conceptReleases().doc(id).set(progressData);
  logger.info('Concept completion created', { conceptId, classId, teacherId, completed: true });
  return {
    id,
    conceptId,
    textbookId,
    chapterId,
    classId,
    teacherId,
    completed: true,
    updatedAt: now,
  };
}

/** Get completion status for a concept in a class. */
export async function getConceptCompletionStatus(
  conceptId: string,
  classId: string,
  teacherId: string,
): Promise<boolean> {
  const existing = await collections.conceptReleases()
    .where('concept_id', '==', conceptId)
    .where('class_id', '==', classId)
    .where('teacher_id', '==', teacherId)
    .get();

  if (existing.docs.length === 0) return false;
  return existing.docs[0].data().completed === true;
}

/** Get all concept completion statuses for a class and teacher. */
export async function getClassCompletionStatus(
  classId: string,
  teacherId: string,
): Promise<Record<string, boolean>> {
  const snapshot = await collections.conceptReleases()
    .where('class_id', '==', classId)
    .where('teacher_id', '==', teacherId)
    .get();

  const result: Record<string, boolean> = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    result[data.concept_id] = data.completed === true;
  }
  return result;
}

/** Get completion progress for a subject (completed / total concepts). */
export async function getSubjectProgress(
  subjectId: string,
  classId: string,
  teacherId: string,
): Promise<{ completed: number; total: number }> {
  // Get all concepts for this subject
  const textbooks = await collections.textbooks()
    .where('subject_id', '==', subjectId)
    .where('class_id', '==', classId)
    .get();

  let totalConcepts = 0;
  for (const textbook of textbooks.docs) {
    const chapters = await collections.textbooks().doc(textbook.id).collection('chapters').get();
    for (const chapter of chapters.docs) {
      const concepts = await collections.textbooks().doc(textbook.id).collection('chapters').doc(chapter.id).collection('concepts').get();
      totalConcepts += concepts.docs.length;
    }
  }

  // Get completed count
  const completionStatus = await getClassCompletionStatus(classId, teacherId);
  const completed = Object.values(completionStatus).filter(Boolean).length;

  return { completed, total: totalConcepts };
}

/** Get student-facing progress (shows completion without content). */
export async function getStudentProgress(
  classId: string,
): Promise<Record<string, { completed: boolean; teacherId: string }[]>> {
  const snapshot = await collections.conceptReleases()
    .where('class_id', '==', classId)
    .get();

  const result: Record<string, { completed: boolean; teacherId: string }[]> = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const conceptId = data.concept_id;
    if (!result[conceptId]) result[conceptId] = [];
    result[conceptId].push({
      completed: data.completed === true,
      teacherId: data.teacher_id,
    });
  }
  return result;
}
