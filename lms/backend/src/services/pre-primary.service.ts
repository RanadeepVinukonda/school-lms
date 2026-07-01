import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/adapter';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getDashboardData(studentId: string) {
  const userDoc = await collections.users().doc(studentId).get();
  if (!userDoc.exists) throw new NotFoundError('Student not found');

  const userData = userDoc.data()!;
  const profile = {
    id: studentId,
    displayName: userData.displayName || 'Student',
    classId: userData.classId || '',
    level: userData.level || 'nursery',
  };

  const progressSnapshot = await collections.prePrimaryProgress()
    .where('studentId', '==', studentId)
    .get();

  const progress: Record<string, number> = {};
  progressSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    progress[data.subject || 'general'] = data.completed || 0;
  });

  const totalStars = progressSnapshot.docs.reduce((sum, doc) => sum + (doc.data().stars || 0), 0);

  return { profile, progress, totalStars };
}

export async function getLessons() {
  const snapshot = await collections.prePrimaryLessons()
    .orderBy('order', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getFlashcards(subjectId: string) {
  const snapshot = await collections.flashcards()
    .where('subjectId', '==', subjectId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getStories() {
  const snapshot = await collections.stories()
    .orderBy('order', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function saveTracing(data: {
  studentId: string;
  content: string;
  type: string;
  label?: string;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const tracingData = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await collections.tracingActivities().doc(id).set(tracingData);
  logger.info('Tracing saved', { id, studentId: data.studentId });
  return { ...tracingData };
}

export async function updateProgress(studentId: string, data: {
  subject: string;
  completed: number;
  stars?: number;
}) {
  const id = `${studentId}_${data.subject}`;
  const ref = collections.prePrimaryProgress().doc(id);
  const existing = await ref.get();

  const now = new Date().toISOString();
  const updateData = {
    ...data,
    studentId,
    updatedAt: now,
  };

  if (existing.exists) {
    await ref.update(updateData);
  } else {
    await ref.set({ ...updateData, id, createdAt: now });
  }

  const updated = await ref.get();
  logger.info('Progress updated', { studentId, subject: data.subject });
  return { ...updated.data() };
}
