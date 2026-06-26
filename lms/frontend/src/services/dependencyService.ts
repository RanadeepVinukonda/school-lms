import { getTextbooksBySubject } from './textbookService';
import { getAssignmentsBySubject, getExamsBySubject, getAllGrades, getStudentsByClass, getTimetableByClass, getUser, getAllUsers } from './dataService';
import { supabase } from '@/firebase/config';

export interface DependencyCategory {
  label: string;
  count: number;
  action?: string;
}

export interface DependencyReport {
  entityName: string;
  entityType: string;
  totalDependents: number;
  categories: DependencyCategory[];
  canArchive: boolean;
  canDelete: boolean;
  recommendedAction: 'archive' | 'deactivate' | 'delete' | 'cancel';
}

async function countQuery(collectionName: string, field: string, value: string): Promise<number> {
  try {
    const { count } = await supabase.from(collectionName).select('*', { count: 'exact', head: true }).eq(field, value);
    return count || 0;
  } catch {
    return 0;
  }
}

async function countArrayQuery(collectionName: string, field: string, value: string): Promise<number> {
  try {
    const { count } = await supabase.from(collectionName).select('*', { count: 'exact', head: true }).contains(field, [value]);
    return count || 0;
  } catch {
    return 0;
  }
}

/** Analyze what depends on a subject before deletion. */
export async function getSubjectDependencies(subjectId: string): Promise<DependencyReport> {
  const [textbooks, assignments, exams, grades] = await Promise.all([
    getTextbooksBySubject(subjectId).catch(() => []),
    getAssignmentsBySubject(subjectId).catch(() => []),
    getExamsBySubject(subjectId).catch(() => []),
    getAllGrades().catch(() => []),
  ]);

  const subjectGrades = grades.filter((g) => g.subjectId === subjectId);

  const categories: DependencyReport['categories'] = [];
  if (textbooks.length > 0) categories.push({ label: 'Textbooks', count: textbooks.length });
  if (assignments.length > 0) categories.push({ label: 'Assignments', count: assignments.length });
  if (exams.length > 0) categories.push({ label: 'Exams', count: exams.length });
  if (subjectGrades.length > 0) categories.push({ label: 'Grade records', count: subjectGrades.length });

  const totalDependents = categories.reduce((s, c) => s + c.count, 0);

  return {
    entityName: 'this subject',
    entityType: 'subject',
    totalDependents,
    categories,
    canArchive: true,
    canDelete: totalDependents === 0,
    recommendedAction: totalDependents > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a class before deletion. */
export async function getClassDependencies(classId: string): Promise<DependencyReport> {
  const [students, timetableEntries, users] = await Promise.all([
    getStudentsByClass(classId).catch(() => []),
    getTimetableByClass(classId).catch(() => []),
    getAllUsers().catch(() => []),
  ]);

  const teachers = users.filter(
    (u) => u.role === 'teacher' && u.classIds?.includes(classId),
  );

  const categories: DependencyReport['categories'] = [];
  if (students.length > 0) categories.push({ label: 'Students assigned', count: students.length });
  if (teachers.length > 0) categories.push({ label: 'Teachers assigned', count: teachers.length });
  if (timetableEntries.length > 0) categories.push({ label: 'Timetable slots', count: timetableEntries.length });

  const totalDependents = categories.reduce((s, c) => s + c.count, 0);

  return {
    entityName: 'this class',
    entityType: 'class',
    totalDependents,
    categories,
    canArchive: true,
    canDelete: students.length === 0,
    recommendedAction: totalDependents > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a user before deletion or deactivation. */
export async function getUserDependencies(userId: string): Promise<DependencyReport> {
  const user = await getUser(userId);
  if (!user) {
    return {
      entityName: 'this user',
      entityType: 'user',
      totalDependents: 0,
      categories: [],
      canArchive: false,
      canDelete: true,
      recommendedAction: 'delete',
    };
  }

  const categories: DependencyReport['categories'] = [];

  if (user.role === 'teacher') {
    const classCount = await countArrayQuery('classes', 'teacherIds', userId);
    if (classCount > 0) {
      categories.push({ label: 'Classes assigned', count: classCount });
    }
  }

  if (user.role === 'student') {
    const allGrades = await getAllGrades().catch(() => []);
    const studentGrades = allGrades.filter((g) => g.studentId === userId);
    if (studentGrades.length > 0) {
      categories.push({ label: 'Grade records', count: studentGrades.length, action: 'Preserved on deactivation' });
    }
    const submissionCount = await countQuery('submissions', 'studentId', userId);
    if (submissionCount > 0) {
      categories.push({ label: 'Submissions', count: submissionCount, action: 'Preserved on deactivation' });
    }
  }

  return {
    entityName: user.displayName,
    entityType: 'user',
    totalDependents: categories.reduce((s, c) => s + c.count, 0),
    categories,
    canArchive: true,
    canDelete: false,
    recommendedAction: 'deactivate',
  };
}

/** Analyze what depends on a course before deletion. */
export async function getCourseDependencies(courseId: string): Promise<DependencyReport> {
  const [lessonCount, assignmentCount, examCount, enrollmentCount, gradeCount] = await Promise.all([
    countQuery('lessons', 'courseId', courseId),
    countQuery('assignments', 'courseId', courseId),
    countQuery('exams', 'courseId', courseId),
    countQuery('enrollment', 'courseId', courseId),
    countQuery('grades', 'courseId', courseId),
  ]);

  const categories: DependencyReport['categories'] = [];
  if (lessonCount > 0) categories.push({ label: 'Lessons', count: lessonCount });
  if (assignmentCount > 0) categories.push({ label: 'Assignments', count: assignmentCount });
  if (examCount > 0) categories.push({ label: 'Exams', count: examCount });
  if (enrollmentCount > 0) categories.push({ label: 'Enrolled students', count: enrollmentCount });
  if (gradeCount > 0) categories.push({ label: 'Grade records', count: gradeCount });

  const total = categories.reduce((s, c) => s + c.count, 0);
  return {
    entityName: 'this course',
    entityType: 'course',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a lesson before deletion. */
export async function getLessonDependencies(lessonId: string): Promise<DependencyReport> {
  const { data: lessonData } = await supabase.from('lessons').select('completedBy').eq('id', lessonId).maybeSingle();
  const completedCount = (lessonData as any)?.completedBy?.length || 0;

  const categories: DependencyReport['categories'] = [];
  if (completedCount > 0) categories.push({ label: 'Students who completed', count: completedCount, action: 'Progress preserved' });

  return {
    entityName: 'this lesson',
    entityType: 'lesson',
    totalDependents: completedCount,
    categories,
    canArchive: false,
    canDelete: true,
    recommendedAction: 'delete',
  };
}

/** Analyze what depends on an assignment before deletion. */
export async function getAssignmentDependencies(assignmentId: string): Promise<DependencyReport> {
  const submissionCount = await countQuery('submissions', 'assignmentId', assignmentId);

  const categories: DependencyReport['categories'] = [];
  if (submissionCount > 0) categories.push({ label: 'Student submissions', count: submissionCount, action: 'Lost on delete' });

  return {
    entityName: 'this assignment',
    entityType: 'assignment',
    totalDependents: submissionCount,
    categories,
    canArchive: true,
    canDelete: submissionCount === 0,
    recommendedAction: submissionCount > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on an exam before deletion. */
export async function getExamDependencies(examId: string): Promise<DependencyReport> {
  const attemptCount = await countQuery('examAttempts', 'examId', examId);

  const categories: DependencyReport['categories'] = [];
  if (attemptCount > 0) categories.push({ label: 'Student attempts', count: attemptCount, action: 'Lost on delete' });

  return {
    entityName: 'this exam',
    entityType: 'exam',
    totalDependents: attemptCount,
    categories,
    canArchive: true,
    canDelete: attemptCount === 0,
    recommendedAction: attemptCount > 0 ? 'archive' : 'delete',
  };
}

/** Analyze what depends on a quiz before deletion. */
export async function getQuizDependencies(quizId: string): Promise<DependencyReport> {
  const attemptCount = await countQuery('quizAttempts', 'quizId', quizId);

  const categories: DependencyReport['categories'] = [];
  if (attemptCount > 0) categories.push({ label: 'Quiz attempts', count: attemptCount, action: 'Lost on delete' });

  return {
    entityName: 'this quiz',
    entityType: 'quiz',
    totalDependents: attemptCount,
    categories,
    canArchive: false,
    canDelete: attemptCount === 0,
    recommendedAction: attemptCount > 0 ? 'cancel' : 'delete',
  };
}

/** Analyze what depends on a textbook before deletion. */
export async function getTextbookDependencies(textbookId: string): Promise<DependencyReport> {
  const [progressCount, conceptCount, chapterCount] = await Promise.all([
    countQuery('conceptProgress', 'textbookId', textbookId),
    countQuery('conceptReleases', 'textbookId', textbookId),
    supabase.from('textbooks').select('chapter_count').eq('id', textbookId).maybeSingle().then(
      (r) => r.data?.chapter_count || 0,
    ).catch(() => 0),
  ]);

  const categories: DependencyReport['categories'] = [];
  if (chapterCount > 0) categories.push({ label: 'Chapters', count: chapterCount, action: 'Deleted with textbook' });
  if (progressCount > 0) categories.push({ label: 'Student progress records', count: progressCount, action: 'Lost on delete' });

  return {
    entityName: 'this textbook',
    entityType: 'textbook',
    totalDependents: progressCount + conceptCount + chapterCount,
    categories,
    canArchive: true,
    canDelete: progressCount === 0,
    recommendedAction: progressCount > 0 ? 'archive' : 'delete',
  };
}
