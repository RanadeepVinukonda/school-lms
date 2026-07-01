import { collections } from '../database/adapter';
import { ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function releaseAssessmentsForClass(classId: string, teacherId: string, options?: { type?: 'quiz' | 'assignment' | 'exam' }) {
  const now = new Date().toISOString();
  let updatedCount = 0;

  const types: Array<'quiz' | 'assignment' | 'exam'> = options?.type ? [options.type] : ['quiz', 'assignment', 'exam'];

  for (const type of types) {
    const collection = type === 'quiz' ? collections.quizV2() : type === 'assignment' ? collections.assignmentV2() : collections.examV2();
    const snapshot = await collection
      .where('classId', '==', classId)
      .where('teacherId', '==', teacherId)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.showResults === true) continue;

      await doc.ref.update({ showResults: true, updatedAt: now });
      updatedCount++;
    }
  }

  logger.info('Batch results released', { classId, teacherId, updatedCount });

  return { updatedCount };
}

export async function releaseSingleAssessment(assessmentId: string, type: 'quiz' | 'assignment' | 'exam', teacherId: string) {
  const collection = type === 'quiz' ? collections.quizV2() : type === 'assignment' ? collections.assignmentV2() : collections.examV2();
  const ref = collection.doc(assessmentId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error(`${type} not found`);
  }

  const data = doc.data()!;
  if (data.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this assessment');
  }

  await ref.update({ showResults: true, updatedAt: new Date().toISOString() });

  logger.info('Single assessment results released', { assessmentId, type, teacherId });

  return { id: assessmentId, type, showResults: true };
}
