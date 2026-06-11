import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** Create a new course with draft status and zero enrollment/lesson counts. */
export async function createCourse(data: {
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  thumbnail?: string;
  syllabus?: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
}) {
  const courseId = uuidv4();
  const now = new Date().toISOString();

  const courseData = {
    ...data,
    id: courseId,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    enrollmentCount: 0,
    lessonCount: 0,
  };

  await collections.courses().doc(courseId).set(courseData);

  logger.info('Course created', { courseId, title: data.title, teacherId: data.teacherId });

  return { ...courseData };
}

/** Update course fields. Throws NotFoundError if missing. */
export async function updateCourse(courseId: string, data: Record<string, unknown>) {
  const courseRef = collections.courses().doc(courseId);
  const course = await courseRef.get();

  if (!course.exists) {
    throw new NotFoundError('Course not found');
  }

  const updateData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await courseRef.update(updateData);

  const updated = await courseRef.get();
  logger.info('Course updated', { courseId });

  return { ...updated.data() };
}

/** Delete a course by id. Throws NotFoundError if missing. */
export async function deleteCourse(courseId: string) {
  const courseRef = collections.courses().doc(courseId);
  const course = await courseRef.get();

  if (!course.exists) {
    throw new NotFoundError('Course not found');
  }

  await courseRef.delete();
  logger.info('Course deleted', { courseId });
}

/** Fetch a single course by id. Throws NotFoundError if missing. */
export async function getCourseById(courseId: string) {
  const courseRef = collections.courses().doc(courseId);
  const course = await courseRef.get();

  if (!course.exists) {
    throw new NotFoundError('Course not found');
  }

  return { ...course.data() };
}

/** List courses with optional filters (status, subjectId, classId, teacherId, search), paginated. */
export async function listCourses(query: {
  page?: string;
  limit?: string;
  status?: string;
  subjectId?: string;
  classId?: string;
  teacherId?: string;
  search?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.courses();

  if (query.status) baseQuery = baseQuery.where('status', '==', query.status);
  if (query.subjectId) baseQuery = baseQuery.where('subjectId', '==', query.subjectId);
  if (query.classId) baseQuery = baseQuery.where('classId', '==', query.classId);
  if (query.teacherId) baseQuery = baseQuery.where('teacherId', '==', query.teacherId);

  const snapshot = await baseQuery.get();

  let items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  items = items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: { id?: string; title?: string; description?: string }) =>
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** Enroll a student in a course. Checks for capacity and duplicate enrollment. */
export async function enrollStudent(courseId: string, studentId: string) {
  const courseRef = collections.courses().doc(courseId);
  const course = await courseRef.get();

  if (!course.exists) {
    throw new NotFoundError('Course not found');
  }

  const courseData = course.data()!;
  if (courseData.maxStudents && courseData.enrollmentCount >= courseData.maxStudents) {
    throw new ForbiddenError('Course is full');
  }

  const enrollmentRef = collections.enrollment().doc(`${courseId}_${studentId}`);
  const existingEnrollment = await enrollmentRef.get();

  if (existingEnrollment.exists) {
    throw new ForbiddenError('Already enrolled in this course');
  }

  await enrollmentRef.set({
    courseId,
    studentId,
    enrolledAt: new Date().toISOString(),
    status: 'active',
    progress: 0,
  });

  await courseRef.update({
    enrollmentCount: FieldValue.increment(1),
    updatedAt: new Date().toISOString(),
  });

  logger.info('Student enrolled in course', { courseId, studentId });
}

/** Unenroll a student from a course and decrement enrollmentCount. */
export async function unenrollStudent(courseId: string, studentId: string) {
  const enrollmentRef = collections.enrollment().doc(`${courseId}_${studentId}`);
  const enrollment = await enrollmentRef.get();

  if (!enrollment.exists) {
    throw new NotFoundError('Enrollment not found');
  }

  await enrollmentRef.delete();

  await collections.courses().doc(courseId).update({
    enrollmentCount: FieldValue.increment(-1),
    updatedAt: new Date().toISOString(),
  });

  logger.info('Student unenrolled from course', { courseId, studentId });
}

/** Get all active enrollments for a given course. */
export async function getEnrollments(courseId: string) {
  const snapshot = await collections.enrollment()
    .where('courseId', '==', courseId)
    .where('status', '==', 'active')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; studentId: string; courseId: string; status: string; progress: number; enrolledAt: string }>;
}
