import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function createLesson(data: {
  title: string;
  description: string;
  courseId: string;
  content?: string;
  contentType?: string;
  videoUrl?: string;
  duration?: number;
  isPublished?: boolean;
}) {
  const lessonId = uuidv4();
  const now = new Date().toISOString();

  const courseDoc = await collections.courses().doc(data.courseId).get();
  if (!courseDoc.exists) {
    throw new NotFoundError('Course not found');
  }

  const lessonsCount = await collections.lessons()
    .where('courseId', '==', data.courseId)
    .count()
    .get();

  const order = lessonsCount.data().count;

  const lessonData = {
    ...data,
    id: lessonId,
    order: order,
    completedBy: [],
    createdAt: now,
    updatedAt: now,
  };

  await collections.lessons().doc(lessonId).set(lessonData);

  await collections.courses().doc(data.courseId).update({
    lessonCount: FieldValue.increment(1),
    updatedAt: now,
  });

  logger.info('Lesson created', { lessonId, courseId: data.courseId, title: data.title });

  return { ...lessonData };
}

export async function updateLesson(lessonId: string, data: Record<string, unknown>) {
  const lessonRef = collections.lessons().doc(lessonId);
  const lesson = await lessonRef.get();

  if (!lesson.exists) {
    throw new NotFoundError('Lesson not found');
  }

  const updateData = { ...data, updatedAt: new Date().toISOString() };
  await lessonRef.update(updateData);

  const updated = await lessonRef.get();
  logger.info('Lesson updated', { lessonId });

  return { ...updated.data() };
}

export async function deleteLesson(lessonId: string) {
  const lessonRef = collections.lessons().doc(lessonId);
  const lesson = await lessonRef.get();

  if (!lesson.exists) {
    throw new NotFoundError('Lesson not found');
  }

  const lessonData = lesson.data()!;
  await lessonRef.delete();

  if (lessonData.courseId) {
    await collections.courses().doc(lessonData.courseId).update({
      lessonCount: FieldValue.increment(-1),
      updatedAt: new Date().toISOString(),
    });
  }

  logger.info('Lesson deleted', { lessonId });
}

export async function getLessonById(lessonId: string) {
  const lessonRef = collections.lessons().doc(lessonId);
  const lesson = await lessonRef.get();

  if (!lesson.exists) {
    throw new NotFoundError('Lesson not found');
  }

  return { ...lesson.data() };
}

export async function listLessonsByCourse(courseId: string) {
  const snapshot = await collections.lessons()
    .where('courseId', '==', courseId)
    .orderBy('order', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function reorderLessons(lessonIds: string[]) {
  const batch = collections.lessons().firestore.batch();

  lessonIds.forEach((id, index) => {
    const ref = collections.lessons().doc(id);
    batch.update(ref, { order: index, updatedAt: new Date().toISOString() });
  });

  await batch.commit();
  logger.info('Lessons reordered');
}

export async function markLessonComplete(lessonId: string, studentId: string) {
  const lessonRef = collections.lessons().doc(lessonId);
  const lesson = await lessonRef.get();

  if (!lesson.exists) {
    throw new NotFoundError('Lesson not found');
  }

  const lessonData = lesson.data()!;
  const completedBy = lessonData.completedBy || [];

  if (!completedBy.includes(studentId)) {
    completedBy.push(studentId);
    await lessonRef.update({
      completedBy: completedBy,
      updatedAt: new Date().toISOString(),
    });
  }

  if (lessonData.courseId) {
    const progressRef = collections.enrollment().doc(`${lessonData.courseId}_${studentId}`);
    const progressDoc = await progressRef.get();

    if (progressDoc.exists) {
      const totalLessons = await collections.lessons()
        .where('courseId', '==', lessonData.courseId)
        .count()
        .get();

      const completedLessons = totalLessons.data().count;
      const progress = completedLessons > 0
        ? Math.round((completedBy.length / completedLessons) * 100)
        : 0;

      await progressRef.update({ progress });
    }
  }

  logger.info('Lesson marked complete', { lessonId, studentId });
}


