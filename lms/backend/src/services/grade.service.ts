import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { createNotification, createBulkNotifications } from './notification.service';

export async function getStudentGrades(studentId: string, academicYear?: string) {
  let query: FirebaseFirestore.Query = collections.grades()
    .where('studentId', '==', studentId);

  if (academicYear) {
    query = query.where('academicYear', '==', academicYear);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export async function getGradebook(query: {
  classId?: string;
  courseId?: string;
  subjectId?: string;
  term?: string;
  academicYear?: string;
  page?: string;
  limit?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.grades();

  if (query.classId) baseQuery = baseQuery.where('classId', '==', query.classId);
  if (query.courseId) baseQuery = baseQuery.where('courseId', '==', query.courseId);
  if (query.subjectId) baseQuery = baseQuery.where('subjectId', '==', query.subjectId);
  if (query.term) baseQuery = baseQuery.where('term', '==', query.term);
  if (query.academicYear) baseQuery = baseQuery.where('academicYear', '==', query.academicYear);

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  return { items, total, page, limit };
}

export async function updateGrade(gradeId: string, data: {
  score: number;
  totalPoints: number;
  letterGrade?: string;
  remarks?: string;
  gradedBy: string;
}) {
  const ref = collections.grades().doc(gradeId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Grade not found');
  }

  const percentage = Math.round((data.score / data.totalPoints) * 100);
  const letterGrade = data.letterGrade || calculateLetterGrade(percentage);

  const updateData = {
    ...data,
    letterGrade,
    percentage,
    updatedAt: new Date().toISOString(),
  };

  await ref.update(updateData);

  // Notify student of grade
  try {
    const gradeData = doc.data()!;
    await createNotification({
      userId: gradeData.studentId as string,
      type: 'grade',
      title: 'Grade Updated',
      body: `Your grade has been updated: ${data.score}/${data.totalPoints} (${percentage}%)`,
      data: { gradeId, courseId: gradeData.courseId as string, link: `/student/subjects/${gradeData.courseId}` },
    });
  } catch (err) {
    logger.warn('Failed to send grade notification', { error: err });
  }

  const updated = await ref.get();
  logger.info('Grade updated', { gradeId, gradedBy: data.gradedBy });

  return { ...updated.data() };
}

export async function bulkUpdate(grades: Array<{
  studentId: string;
  score: number;
  totalPoints: number;
  feedback?: string;
}>, courseId: string, gradedBy: string) {
  const results = [];

  for (const grade of grades) {
    const gradeId = `${courseId}_${grade.studentId}`;
    const ref = collections.grades().doc(gradeId);
    const existing = await ref.get();

    const percentage = Math.round((grade.score / grade.totalPoints) * 100);
    const now = new Date().toISOString();

    if (existing.exists) {
      await ref.update({
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy,
        updatedAt: now,
      });
    } else {
      await ref.set({
        studentId: grade.studentId,
        courseId,
        score: grade.score,
        totalPoints: grade.totalPoints,
        percentage,
        feedback: grade.feedback || '',
        gradedBy,
        createdAt: now,
        updatedAt: now,
      });
    }

    results.push({ id: gradeId, studentId: grade.studentId, score: grade.score, percentage });
  }

  // Notify all graded students
  try {
    const notifications = results.map((r) => ({
      userId: r.studentId,
      type: 'grade',
      title: 'Grades Published',
      body: `Your grade for ${courseId}: ${r.score}/${grades.find(g => g.studentId === r.studentId)?.totalPoints || 100}`,
      data: { courseId, link: `/student/subjects/${courseId}` },
    }));
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.warn('Failed to send bulk grade notifications', { error: err });
  }

  logger.info('Bulk grades updated', { courseId, count: grades.length, gradedBy });

  return results;
}

export async function generateReport(studentId: string, academicYear: string, term: string) {
  const gradesSnapshot = await collections.grades()
    .where('studentId', '==', studentId)
    .where('academicYear', '==', academicYear)
    .where('term', '==', term)
    .get();

  const grades = gradesSnapshot.docs.map((d) => d.data());

  const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
  const totalPoints = grades.reduce((sum: number, g: any) => sum + (g.totalPoints || 1), 0);
  const overallPercentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
  const gpa = calculateGPA(overallPercentage);

  return {
    studentId,
    academicYear,
    term,
    grades,
    summary: {
      totalCourses: grades.length,
      totalScore,
      totalPoints,
      overallPercentage,
      gpa,
      letterGrade: calculateLetterGrade(overallPercentage),
    },
  };
}

function calculateLetterGrade(percentage: number): string {
  if (percentage >= 97) return 'A+';
  if (percentage >= 93) return 'A';
  if (percentage >= 90) return 'A-';
  if (percentage >= 87) return 'B+';
  if (percentage >= 83) return 'B';
  if (percentage >= 80) return 'B-';
  if (percentage >= 77) return 'C+';
  if (percentage >= 73) return 'C';
  if (percentage >= 70) return 'C-';
  if (percentage >= 67) return 'D+';
  if (percentage >= 63) return 'D';
  if (percentage >= 60) return 'D-';
  return 'F';
}

function calculateGPA(percentage: number): number {
  if (percentage >= 93) return 4.0;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3.0;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2.0;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 63) return 1.0;
  if (percentage >= 60) return 0.7;
  return 0.0;
}


