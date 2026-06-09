import { collections } from '../firebase/firestore';
import { ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface DependencyCategory {
  label: string;
  count: number;
  collection: string;
  filterField: string;
}

export interface ImpactReport {
  entityName: string;
  entityType: string;
  totalDependents: number;
  categories: DependencyCategory[];
  canArchive: boolean;
  canDelete: boolean;
  recommendedAction: 'archive' | 'deactivate' | 'delete' | 'none';
}

async function countWhere(collectionName: string, field: string, value: string): Promise<number> {
  try {
    const snapshot = await (collections as Record<string, () => FirebaseFirestore.CollectionReference>)[collectionName]()
      .where(field, '==', value)
      .limit(1000)
      .count()
      .get();
    return snapshot.data().count;
  } catch {
    try {
      const snapshot = await (collections as Record<string, () => FirebaseFirestore.CollectionReference>)[collectionName]()
        .where(field, '==', value)
        .get();
      return snapshot.docs.length;
    } catch {
      return 0;
    }
  }
}

async function countArrayWhere(collectionName: string, field: string, value: string): Promise<number> {
  try {
    const snapshot = await (collections as Record<string, () => FirebaseFirestore.CollectionReference>)[collectionName]()
      .where(field, 'array-contains', value)
      .limit(1000)
      .count()
      .get();
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

export async function getSubjectImpact(subjectId: string): Promise<ImpactReport> {
  const subjectDoc = await collections.subjects().doc(subjectId).get();
  const subjectName = subjectDoc.exists ? (subjectDoc.data()?.name as string) || subjectId : subjectId;

  const categories: DependencyCategory[] = [];
  let total = 0;

  const checks: Array<{ label: string; collection: string; field: string }> = [
    { label: 'Courses', collection: 'courses', field: 'subjectId' },
    { label: 'Assignments', collection: 'assignments', field: 'subjectId' },
    { label: 'Exams', collection: 'exams', field: 'subjectId' },
    { label: 'Grade Records', collection: 'grades', field: 'subjectId' },
  ];

  for (const check of checks) {
    const count = await countWhere(check.collection, check.field, subjectId);
    if (count > 0) {
      categories.push({ label: check.label, count, collection: check.collection, filterField: check.field });
      total += count;
    }
  }

  return {
    entityName: subjectName,
    entityType: 'subject',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

export async function getClassImpact(classId: string): Promise<ImpactReport> {
  const classDoc = await collections.classes().doc(classId).get();
  const className = classDoc.exists ? (classDoc.data()?.name as string) || classId : classId;

  const categories: DependencyCategory[] = [];
  let total = 0;

  const studentCount = await countArrayWhere('users', 'classIds', classId);
  if (studentCount > 0) {
    categories.push({ label: 'Students', count: studentCount, collection: 'users', filterField: 'classIds' });
    total += studentCount;
  }

  const timetableCount = await countWhere('timetable', 'classId', classId);
  if (timetableCount > 0) {
    categories.push({ label: 'Timetable Entries', count: timetableCount, collection: 'timetable', filterField: 'classId' });
    total += timetableCount;
  }

  return {
    entityName: className,
    entityType: 'class',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: studentCount === 0,
    recommendedAction: studentCount > 0 ? 'archive' : 'delete',
  };
}

export async function getCourseImpact(courseId: string): Promise<ImpactReport> {
  const courseDoc = await collections.courses().doc(courseId).get();
  const courseTitle = courseDoc.exists ? (courseDoc.data()?.title as string) || courseId : courseId;

  const categories: DependencyCategory[] = [];
  let total = 0;

  const checks: Array<{ label: string; collection: string; field: string }> = [
    { label: 'Lessons', collection: 'lessons', field: 'courseId' },
    { label: 'Assignments', collection: 'assignments', field: 'courseId' },
    { label: 'Exams', collection: 'exams', field: 'courseId' },
    { label: 'Enrolled Students', collection: 'enrollment', field: 'courseId' },
    { label: 'Grade Records', collection: 'grades', field: 'courseId' },
  ];

  for (const check of checks) {
    const count = await countWhere(check.collection, check.field, courseId);
    if (count > 0) {
      categories.push({ label: check.label, count, collection: check.collection, filterField: check.field });
      total += count;
    }
  }

  return {
    entityName: courseTitle,
    entityType: 'course',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

export async function getLessonImpact(lessonId: string): Promise<ImpactReport> {
  const lessonDoc = await collections.lessons().doc(lessonId).get();
  const lessonTitle = lessonDoc.exists ? (lessonDoc.data()?.title as string) || lessonId : lessonId;

  const categories: DependencyCategory[] = [];
  const lessonData = lessonDoc.data();
  const completedCount = (lessonData?.completedBy as string[])?.length || 0;
  if (completedCount > 0) {
    categories.push({ label: 'Students Completed', count: completedCount, collection: 'lessons', filterField: 'completedBy' });
  }

  return {
    entityName: lessonTitle,
    entityType: 'lesson',
    totalDependents: completedCount,
    categories,
    canArchive: false,
    canDelete: true,
    recommendedAction: 'delete',
  };
}

export async function getAssignmentImpact(assignmentId: string): Promise<ImpactReport> {
  const assignmentDoc = await collections.assignments().doc(assignmentId).get();
  const assignmentTitle = assignmentDoc.exists ? (assignmentDoc.data()?.title as string) || assignmentId : assignmentId;

  const submissionCount = await countWhere('submissions', 'assignmentId', assignmentId);
  const categories: DependencyCategory[] = [];
  if (submissionCount > 0) {
    categories.push({ label: 'Student Submissions', count: submissionCount, collection: 'submissions', filterField: 'assignmentId' });
  }

  return {
    entityName: assignmentTitle,
    entityType: 'assignment',
    totalDependents: submissionCount,
    categories,
    canArchive: true,
    canDelete: submissionCount === 0,
    recommendedAction: submissionCount > 0 ? 'archive' : 'delete',
  };
}

export async function getExamImpact(examId: string): Promise<ImpactReport> {
  const examDoc = await collections.exams().doc(examId).get();
  const examTitle = examDoc.exists ? (examDoc.data()?.title as string) || examId : examId;

  const attemptCount = await countWhere('examAttempts', 'examId', examId);
  const categories: DependencyCategory[] = [];
  if (attemptCount > 0) {
    categories.push({ label: 'Student Attempts', count: attemptCount, collection: 'examAttempts', filterField: 'examId' });
  }

  return {
    entityName: examTitle,
    entityType: 'exam',
    totalDependents: attemptCount,
    categories,
    canArchive: true,
    canDelete: attemptCount === 0,
    recommendedAction: attemptCount > 0 ? 'archive' : 'delete',
  };
}

export async function getQuizImpact(quizId: string): Promise<ImpactReport> {
  const quizDoc = await collections.quizzes().doc(quizId).get();
  const quizTitle = quizDoc.exists ? (quizDoc.data()?.title as string) || quizId : quizId;

  const attemptCount = await countWhere('quizAttempts', 'quizId', quizId);
  const categories: DependencyCategory[] = [];
  if (attemptCount > 0) {
    categories.push({ label: 'Quiz Attempts', count: attemptCount, collection: 'quizAttempts', filterField: 'quizId' });
  }

  return {
    entityName: quizTitle,
    entityType: 'quiz',
    totalDependents: attemptCount,
    categories,
    canArchive: false,
    canDelete: attemptCount === 0,
    recommendedAction: attemptCount > 0 ? 'none' : 'delete',
  };
}

export async function getUserImpact(userId: string): Promise<ImpactReport> {
  const userDoc = await collections.users().doc(userId).get();
  const userName = userDoc.exists ? (userDoc.data()?.displayName as string) || userId : userId;
  const userData = userDoc.data();

  const categories: DependencyCategory[] = [];
  let total = 0;

  if (userData?.role === 'teacher') {
    const classCount = await countArrayWhere('classes', 'teacherIds', userId);
    if (classCount > 0) {
      categories.push({ label: 'Assigned Classes', count: classCount, collection: 'classes', filterField: 'teacherIds' });
      total += classCount;
    }
    const courseCount = await countWhere('courses', 'teacherId', userId);
    if (courseCount > 0) {
      categories.push({ label: 'Courses Taught', count: courseCount, collection: 'courses', filterField: 'teacherId' });
      total += courseCount;
    }
  }

  if (userData?.role === 'student') {
    const gradeCount = await countWhere('grades', 'studentId', userId);
    if (gradeCount > 0) {
      categories.push({ label: 'Grade Records', count: gradeCount, collection: 'grades', filterField: 'studentId' });
      total += gradeCount;
    }
    const submissionCount = await countWhere('submissions', 'studentId', userId);
    if (submissionCount > 0) {
      categories.push({ label: 'Submissions', count: submissionCount, collection: 'submissions', filterField: 'studentId' });
      total += submissionCount;
    }
  }

  return {
    entityName: userName,
    entityType: 'user',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: false,
    recommendedAction: 'deactivate',
  };
}

export async function requireNoDependenciesOrThrow(
  entityType: string,
  entityId: string,
  impactFn: (id: string) => Promise<ImpactReport>
): Promise<void> {
  const report = await impactFn(entityId);
  if (report.totalDependents > 0) {
    const details = report.categories.map((c) => `${c.count} ${c.label}`).join(', ');
    throw new ConflictError(
      `Cannot delete ${entityType} "${report.entityName}": ${report.totalDependents} dependenc${report.totalDependents === 1 ? 'y' : 'ies'} found (${details}). Archive instead.`,
      { impact: report }
    );
  }
}
