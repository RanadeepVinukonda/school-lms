import { getSupabaseAdmin } from './supabase';
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

const supabase = () => getSupabaseAdmin()!;

async function countTyped(table: string, field: string, value: string): Promise<number> {
  try {
    const { count } = await supabase().from(table).select('*', { count: 'exact', head: true }).eq(field, value);
    return count || 0;
  } catch { return 0; }
}

async function countNosql(collection: string, field: string, value: string): Promise<number> {
  try {
    const { count } = await supabase().from('nosql_docs')
      .select('*', { count: 'exact', head: true })
      .eq('collection', collection)
      .contains('data', { [field]: value });
    return count || 0;
  } catch { return 0; }
}

async function countArrayTyped(table: string, field: string, value: string): Promise<number> {
  try {
    const { count } = await supabase().from(table).select('*', { count: 'exact', head: true }).contains(field, [value]);
    return count || 0;
  } catch { return 0; }
}

async function countWhere(collectionName: string, field: string, value: string): Promise<number> {
  const TYPED: Record<string, string> = {
    assignments: 'assignments', exams: 'exams', grades: 'grades',
    submissions: 'submissions', quizzes: 'quizzes', timetable: 'timetable',
    subjects: 'subjects', classes: 'classes', users: 'users',
  };
  if (TYPED[collectionName]) return countTyped(TYPED[collectionName], field, value);
  return countNosql(collectionName, field, value);
}

async function countArrayWhere(collectionName: string, field: string, value: string): Promise<number> {
  const TYPED: Record<string, string> = { users: 'users', classes: 'classes' };
  if (TYPED[collectionName]) return countArrayTyped(TYPED[collectionName], field, value);
  return countNosql(collectionName, field, value);
}

async function docById(collectionName: string, docId: string) {
  const TYPED: Record<string, string> = {
    assignments: 'assignments', exams: 'exams', grades: 'grades',
    quizzes: 'quizzes', subjects: 'subjects', classes: 'classes',
    users: 'users', lessons: 'lessons', courses: 'courses',
  };
  if (TYPED[collectionName]) {
    const { data } = await supabase().from(TYPED[collectionName]).select('*').eq('id', docId).maybeSingle();
    return data || null;
  }
  const { data } = await supabase().from('nosql_docs').select('data').eq('collection', collectionName).eq('doc_id', docId).maybeSingle();
  return data?.data as Record<string, unknown> | null || null;
}

export async function getSubjectImpact(subjectId: string): Promise<ImpactReport> {
  const subject = await docById('subjects', subjectId);
  const subjectName = subject?.name || subjectId;

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
    entityName: subjectName as string,
    entityType: 'subject',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

export async function getClassImpact(classId: string): Promise<ImpactReport> {
  const cls = await docById('classes', classId);
  const className = cls?.name || classId;

  const categories: DependencyCategory[] = [];
  let total = 0;

  const sCount = await countArrayTyped('users', 'class_ids', classId);
  if (sCount > 0) {
    categories.push({ label: 'Students', count: sCount, collection: 'users', filterField: 'class_ids' });
    total += sCount;
  }

  const timetableCount = await countTyped('timetable', 'class_id', classId);
  if (timetableCount > 0) {
    categories.push({ label: 'Timetable Entries', count: timetableCount, collection: 'timetable', filterField: 'class_id' });
    total += timetableCount;
  }

  return {
    entityName: className as string,
    entityType: 'class',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

export async function getCourseImpact(courseId: string): Promise<ImpactReport> {
  const course = await docById('courses', courseId);
  const courseTitle = course?.title || courseId;

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
    entityName: courseTitle as string,
    entityType: 'course',
    totalDependents: total,
    categories,
    canArchive: true,
    canDelete: total === 0,
    recommendedAction: total > 0 ? 'archive' : 'delete',
  };
}

export async function getLessonImpact(lessonId: string): Promise<ImpactReport> {
  const { data: lessonRow } = await supabase().from('lessons').select('*').eq('id', lessonId).maybeSingle();
  const lessonData = lessonRow?.data as Record<string, unknown> || {};
  const lessonTitle = lessonData.title || lessonId;
  const completedBy = (lessonData.completedBy as string[]) || [];
  const completedCount = completedBy.length;

  const categories: DependencyCategory[] = [];
  if (completedCount > 0) {
    categories.push({ label: 'Students Completed', count: completedCount, collection: 'lessons', filterField: 'completedBy' });
  }

  return {
    entityName: lessonTitle as string,
    entityType: 'lesson',
    totalDependents: completedCount,
    categories,
    canArchive: false,
    canDelete: true,
    recommendedAction: 'delete',
  };
}

export async function getAssignmentImpact(assignmentId: string): Promise<ImpactReport> {
  const { data: assignDoc } = await supabase().from('assignments').select('*').eq('id', assignmentId).maybeSingle();
  const assignmentTitle = assignDoc?.title || assignmentId;

  const submissionCount = await countTyped('submissions', 'assignmentId', assignmentId);
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
  const { data: examDoc } = await supabase().from('exams').select('*').eq('id', examId).maybeSingle();
  const examTitle = examDoc?.title || examId;

  const attemptCount = await countNosql('examAttempts', 'examId', examId);
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
  const { data: quizDoc } = await supabase().from('quizzes').select('*').eq('id', quizId).maybeSingle();
  const quizTitle = quizDoc?.title || quizId;

  const attemptCount = await countNosql('quizAttempts', 'quizId', quizId);
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
  const { data: userDoc } = await supabase().from('users').select('*').eq('id', userId).maybeSingle();
  const userName = userDoc?.display_name || userId;
  const userData = userDoc?.data as Record<string, unknown> || {};

  const categories: DependencyCategory[] = [];
  let total = 0;

  if (userDoc?.role === 'teacher') {
    const classCount = await countArrayTyped('classes', 'teacher_ids', userId);
    if (classCount > 0) {
      categories.push({ label: 'Assigned Classes', count: classCount, collection: 'classes', filterField: 'teacher_ids' });
      total += classCount;
    }
    const courseCount = await countNosql('courses', 'teacherId', userId);
    if (courseCount > 0) {
      categories.push({ label: 'Courses Taught', count: courseCount, collection: 'courses', filterField: 'teacherId' });
      total += courseCount;
    }
  }

  if (userDoc?.role === 'student') {
    const gradeCount = await countTyped('grades', 'studentId', userId);
    if (gradeCount > 0) {
      categories.push({ label: 'Grade Records', count: gradeCount, collection: 'grades', filterField: 'studentId' });
      total += gradeCount;
    }
    const submissionCount = await countTyped('submissions', 'studentId', userId);
    if (submissionCount > 0) {
      categories.push({ label: 'Submissions', count: submissionCount, collection: 'submissions', filterField: 'studentId' });
      total += submissionCount;
    }
  }

  return {
    entityName: userName || userId,
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
