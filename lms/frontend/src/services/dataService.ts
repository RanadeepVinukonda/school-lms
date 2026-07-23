import { supabase } from '@/supabase/config';
import { logAudit } from '@/services/auditService';

export interface Subject {
  id: string;
  name: string;
  code: string;
  classId?: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  credits?: number;
  department?: string;
  thumbnail?: string;
  isElective?: boolean;
  gradeLevels?: string[];
  tags?: string[];
  syllabus?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id?: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: string;
  progress: number;
}

export interface ClassEntry {
  id: string;
  name: string;
  code: string;
  description?: string;
  grade?: string;
  section?: string;
  academicYear?: string;
  roomNumber?: string;
  teacherIds?: string[];
  subjectIds?: string[];
  studentCount?: number;
  maxStudents?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  courseId?: string;
  subjectId?: string;
  classId?: string;
  itemName?: string;
  score: number;
  totalPoints: number;
  percentage: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy?: string;
  academicYear?: string;
  term?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  link?: string;
  priority?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

const SUBJECTS_COLLECTION = 'subjects';
const ENROLLMENT_COLLECTION = 'enrollment';
const CLASSES_COLLECTION = 'classes';
const GRADES_COLLECTION = 'grades';
const NOTIFICATIONS_COLLECTION = 'notifications';

/** Fetch all subjects from Supabase. */
export async function getAllSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase.from(SUBJECTS_COLLECTION).select('*');
  if (error) throw error;
  return (data || []) as Subject[];
}

/** Fetch all teachers from Supabase. */
export async function getAllTeachers(): Promise<any[]> {
  const { data, error } = await supabase.from('users').select('id, display_name, email').eq('role', 'teacher');
  if (error) throw error;
  return (data || []) as any[];
}

/** Fetch a single subject by id. */
export async function getSubject(id: string): Promise<Subject | null> {
  const { data, error } = await supabase.from(SUBJECTS_COLLECTION).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Subject | null;
}

/** Fetch all students belonging to a class. */
export async function getStudentsByClass(classId: string): Promise<UserDoc[]> {
  const { data, error } = await supabase.from('users').select('*').eq('class_id', classId);
  if (error) throw error;
  return (data || []).map(mapUserRowToDoc);
}

/** Create an enrollment linking a student to a course (subject). */
export async function createEnrollment(studentId: string, courseId: string): Promise<void> {
  const eid = `${courseId}_${studentId}`;
  const { error } = await supabase.from(ENROLLMENT_COLLECTION).upsert({
    id: eid,
    studentId,
    courseId,
    status: 'active',
    progress: 0,
    enrolledAt: new Date().toISOString(),
  });
  if (error) throw error;
  logAudit({
    action: 'enrollment.create',
    targetId: eid,
    targetType: 'enrollment',
    targetName: `Student ${studentId} → Course ${courseId}`,
    summary: `Enrolled student ${studentId} in course ${courseId}`,
    newValue: { studentId, courseId, status: 'active' },
  });
}

/** Get all enrollments for a given student. */
export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase.from(ENROLLMENT_COLLECTION).select('*').eq('studentId', studentId);
  if (error) throw error;
  return (data || []) as unknown as Enrollment[];
}

/** Get classes by an array of class ids. */
export async function getClassesByIds(ids: string[]): Promise<ClassEntry[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from(CLASSES_COLLECTION).select('*').in('id', ids);
  if (error) throw error;
  return (data || []) as unknown as ClassEntry[];
}

/** Fetch a single class by id. */
export async function getClass(id: string): Promise<ClassEntry | null> {
  const { data, error } = await supabase.from(CLASSES_COLLECTION).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as ClassEntry | null;
}

/** Fetch all classes from Supabase. */
export async function getAllClasses(): Promise<ClassEntry[]> {
  const { data, error } = await supabase.from(CLASSES_COLLECTION).select('*');
  if (error) throw error;
  return (data || []) as unknown as ClassEntry[];
}

/** Fetch all exams from Supabase. */
export async function getAllExams(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from('exams').select('*');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

/** Fetch all assignments from Supabase. */
export async function getAllAssignments(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from('assignments').select('*');
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

/** Fetch all enrollment records from Supabase. */
export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase.from(ENROLLMENT_COLLECTION).select('*');
  if (error) throw error;
  return (data || []) as unknown as Enrollment[];
}

/** Fetch all grade records from Supabase. */
export async function getAllGrades(): Promise<GradeEntry[]> {
  const { data, error } = await supabase.from(GRADES_COLLECTION).select('*');
  if (error) throw error;
  return (data || []) as unknown as GradeEntry[];
}

export interface AttemptEntry {
  id: string;
  studentId: string;
  courseId?: string;
  subjectId?: string;
  classId?: string;
  itemName?: string;
  score: number;
  totalPoints: number;
  percentage: number;
  createdAt: string;
}

/** Fetch grades for a specific student. */
export async function getGradesByStudent(studentId: string): Promise<GradeEntry[]> {
  const { data, error } = await supabase.from(GRADES_COLLECTION).select('*').eq('studentId', studentId);
  if (error) throw error;
  return (data || []) as unknown as GradeEntry[];
}

/** Fetch completed quiz attempts for a student from firestore_docs. */
export async function getCompletedQuizAttempts(studentId: string): Promise<AttemptEntry[]> {
  const { data, error } = await supabase
    .from('firestore_docs')
    .select('doc_id, data, created_at')
    .eq('collection', 'quizAttemptV2')
    .filter('data->>studentId', 'eq', studentId)
    .filter('data->>status', 'eq', 'completed');
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.doc_id,
    studentId,
    courseId: r.data?.courseId,
    subjectId: r.data?.subjectId,
    classId: r.data?.classId,
    itemName: r.data?.itemName,
    score: r.data?.score ?? 0,
    totalPoints: r.data?.totalPoints ?? 0,
    percentage: r.data?.percentage ?? 0,
    createdAt: r.created_at || r.data?.submittedAt || new Date().toISOString(),
  }));
}

/** Fetch completed assignment attempts for a student from firestore_docs. */
export async function getCompletedAssignmentAttempts(studentId: string): Promise<AttemptEntry[]> {
  const { data, error } = await supabase
    .from('firestore_docs')
    .select('doc_id, data, created_at')
    .eq('collection', 'assignmentSubmissionV2')
    .filter('data->>studentId', 'eq', studentId)
    .filter('data->>status', 'eq', 'completed');
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.doc_id,
    studentId,
    courseId: r.data?.courseId,
    subjectId: r.data?.subjectId,
    classId: r.data?.classId,
    itemName: r.data?.itemName,
    score: r.data?.score ?? 0,
    totalPoints: r.data?.totalPoints ?? 0,
    percentage: r.data?.percentage ?? 0,
    createdAt: r.created_at || r.data?.submittedAt || new Date().toISOString(),
  }));
}

/** Fetch notifications for a specific user. */
export async function getNotificationsByUser(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase.from(NOTIFICATIONS_COLLECTION).select('*').eq('userId', userId);
  if (error) throw error;
  return (data || []) as NotificationItem[];
}

/** Get count of unread notifications for a user. */
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase.from(NOTIFICATIONS_COLLECTION).select('*', { count: 'exact', head: true }).eq('userId', userId).eq('read', false);
  if (error) throw error;
  return count || 0;
}

/** Mark a single notification as read. */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from(NOTIFICATIONS_COLLECTION).update({ read: true, readAt: new Date().toISOString() }).eq('id', notificationId);
  if (error) throw error;
}

/** Mark all unread notifications as read for a user. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.from(NOTIFICATIONS_COLLECTION).update({ read: true, readAt: new Date().toISOString() }).eq('userId', userId).eq('read', false);
  if (error) throw error;
}

// ── Assignments ──
export interface AssignmentItem {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  chapterId?: string;
  textbookId?: string;
  lessonId?: string;
  courseId?: string;
  dueDate?: string;
  points?: number;
  maxAttempts?: number;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  passingGrade?: number;
  status?: string;
  submissionCount?: number;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Fetch assignments for a specific subject. */
export async function getAssignmentsBySubject(subjectId: string): Promise<AssignmentItem[]> {
  const { data, error } = await supabase.from('assignments').select('*').eq('subjectId', subjectId);
  if (error) throw error;
  return (data || []) as AssignmentItem[];
}

/** Fetch a single assignment by id. */
export async function getAssignment(id: string): Promise<AssignmentItem | null> {
  const { data, error } = await supabase.from('assignments').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as AssignmentItem | null;
}

// ── Submissions ──
export interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string;
  attachments?: string[];
  submittedAt?: string;
  status?: string;
  attemptNumber?: number;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

/** Fetch submissions for a specific assignment. */
export async function getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionItem[]> {
  const { data, error } = await supabase.from('submissions').select('*').eq('assignmentId', assignmentId);
  if (error) throw error;
  return (data || []) as SubmissionItem[];
}

// ── Exams ──
export interface ExamItem {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  courseId?: string;
  duration?: number;
  totalPoints?: number;
  passingScore?: number;
  questions?: unknown[];
  status?: string;
  startDate?: string;
  endDate?: string;
  isProctored?: boolean;
  shuffleQuestions?: boolean;
  showResults?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Fetch exams for a specific subject. */
export async function getExamsBySubject(subjectId: string): Promise<ExamItem[]> {
  const { data, error } = await supabase.from('exams').select('*').eq('subjectId', subjectId);
  if (error) throw error;
  return (data || []) as ExamItem[];
}

/** Fetch a single exam by id. */
export async function getExam(id: string): Promise<ExamItem | null> {
  const { data, error } = await supabase.from('exams').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ExamItem | null;
}

// ── Corrections ──
export interface CorrectionItem {
  id: string;
  examId: string;
  studentId: string;
  teacherId: string;
  questionMarks?: unknown[];
  totalMarks?: number;
  overallFeedback?: string;
  status?: string;
  correctedAt?: string;
}

/** Fetch corrections for a specific student. */
export async function getCorrectionsByStudent(studentId: string): Promise<CorrectionItem[]> {
  const { data, error } = await supabase.from('corrections').select('*').eq('studentId', studentId);
  if (error) throw error;
  return (data || []) as CorrectionItem[];
}

/** Fetch corrections for a specific exam. */
export async function getCorrectionsByExam(examId: string): Promise<CorrectionItem[]> {
  const { data, error } = await supabase.from('corrections').select('*').eq('examId', examId);
  if (error) throw error;
  return (data || []) as CorrectionItem[];
}

// ── Quizzes ──
export interface QuizItem {
  id: string;
  title: string;
  description?: string;
  lessonId?: string;
  chapterId?: string;
  textbookId?: string;
  subjectId?: string;
  subjectName?: string;
  timeLimit?: number;
  questions?: unknown[];
  questionCount?: number;
  status?: string;
}

/** Fetch a single quiz by id. Checks quizzes and quizV2 collections. */
export async function getQuiz(id: string): Promise<QuizItem | null> {
  const { data: quizData, error: quizErr } = await supabase.from('quizzes').select('*').eq('id', id).maybeSingle();
  if (quizErr) throw quizErr;
  if (quizData) return quizData as unknown as QuizItem;
  const { data: v2Data, error: v2Err } = await supabase.from('quizV2').select('*').eq('id', id).maybeSingle();
  if (v2Err) throw v2Err;
  if (!v2Data) return null;
  const result: QuizItem = v2Data as unknown as QuizItem;
  if (v2Data.textbookId && v2Data.chapterId && v2Data.conceptId) {
    try {
      const { data: questions, error: qErr } = await supabase
        .from('concept_questions')
        .select('*')
        .eq('concept_id', v2Data.conceptId);
      if (qErr) throw qErr;
      result.questions = (questions || []) as any[];
    } catch { /* questions not available */ }
  }
  return result;
}

// ── Timetable ──
export interface TimetableEntry {
  id: string;
  classId?: string;
  day?: string;
  period?: number;
  subjectId?: string;
  teacherId?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Fetch timetable entries for a specific class. */
export async function getTimetableByClass(classId: string): Promise<TimetableEntry[]> {
  const { data, error } = await supabase.from('timetable').select('*').eq('classId', classId);
  if (error) throw error;
  return (data || []) as TimetableEntry[];
}

// ── Users ──
export interface UserDoc {
  id: string;
  email: string;
  displayName: string;
  role: string;
  studentId?: string;
  classId?: string;
  classIds?: string[];
  teacherId?: string;
  rollNo?: number;
  academicYear?: string;
  photoURL?: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
  childrenIds?: string[];
  isActive?: boolean;
  notificationPreferences?: {
    email?: Record<string, boolean>;
    push?: Record<string, boolean>;
    sms?: Record<string, boolean>;
    inApp?: Record<string, boolean>;
  };
  streakCount?: number;
  lastActiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Fetch all users with a specific role. */
export async function getUserByRole(role: string): Promise<UserDoc[]> {
  const { data, error } = await supabase.from('users').select('*').eq('role', role);
  if (error) throw error;
  return (data || []).map(mapUserRowToDoc);
}

/** Fetch a single user by id. */
export async function getUser(id: string): Promise<UserDoc | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapUserRowToDoc(data) : null;
}

/** Fetch all users from Supabase. */
export async function getAllUsers(): Promise<UserDoc[]> {
  const { data, error } = await supabase.from('users').select('*').is('deleted_at', null);
  if (error) throw error;
  return (data || []).map(mapUserRowToDoc);
}

const EXTRA_USER_FIELDS = ['bio', 'address', 'dateOfBirth'] as const;

function parseDataColumn(row: any): Record<string, unknown> {
  if (!row || row.data == null) return {};
  if (typeof row.data === 'object') return row.data as Record<string, unknown>;
  if (typeof row.data === 'string') try { return JSON.parse(row.data); } catch { return {}; }
  return {};
}

/** Map SQL snake_case row to frontend camelCase UserDoc. */
export function mapUserRowToDoc(row: any): UserDoc {
  const extras = parseDataColumn(row);
  return {
    ...row,
    displayName: row.display_name || row.displayName,
    photoURL: row.photo_url || row.photoURL,
    isActive: row.is_active !== undefined ? row.is_active : row.isActive,
    classIds: row.class_ids || row.classIds,
    classId: row.class_id || row.classId,
    studentId: row.student_id || row.studentId,
    rollNo: row.roll_no || row.rollNo,
    academicYear: row.academic_year || row.academicYear,
    childrenIds: row.children_ids || row.childrenIds,
    lastActiveDate: row.last_active_date || row.lastActiveDate,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    phone: row.phone || row.phone_number || '',
    bio: (extras.bio as string) || row.bio || '',
    address: (extras.address as string) || row.address || '',
    dateOfBirth: (extras.dateOfBirth as string) || row.date_of_birth || row.dateOfBirth || '',
  };
}

/** Map frontend camelCase UserDoc to SQL snake_case row. */
export function mapUserDocToRow(doc: Partial<UserDoc>): any {
  const row: any = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v === undefined) continue;
    if (EXTRA_USER_FIELDS.includes(k as any)) {
      row.data = { ...((row.data as Record<string, unknown>) || {}), [k]: v };
    } else {
      row[k] = v;
    }
  }
  if (doc.displayName !== undefined) { row.display_name = doc.displayName; delete row.displayName; }
  if (doc.photoURL !== undefined) { row.photo_url = doc.photoURL; delete row.photoURL; }
  if (doc.isActive !== undefined) { row.is_active = doc.isActive; delete row.isActive; }
  if (doc.classIds !== undefined) { row.class_ids = doc.classIds; delete row.classIds; }
  if (doc.classId !== undefined) { row.class_id = doc.classId; delete row.classId; }
  if (doc.studentId !== undefined) { row.student_id = doc.studentId; delete row.studentId; }
  if (doc.rollNo !== undefined) { row.roll_no = doc.rollNo; delete row.rollNo; }
  if (doc.academicYear !== undefined) { row.academic_year = doc.academicYear; delete row.academicYear; }
  if (doc.childrenIds !== undefined) { row.children_ids = doc.childrenIds; delete row.childrenIds; }
  if (doc.lastActiveDate !== undefined) { row.last_active_date = doc.lastActiveDate; delete row.lastActiveDate; }
  if (doc.phone !== undefined) { row.phone_number = doc.phone; delete row.phone; }
  return row;
}

/** Update a user document, stripping undefined fields and merging with existing data. */
export async function updateUser(id: string, data: Partial<UserDoc>): Promise<void> {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  const rowData = mapUserDocToRow(cleanData);
  const { error } = await supabase.from('users').update({ ...rowData, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  logAudit({
    action: 'profile.update',
    targetId: id,
    targetType: 'user',
    targetName: id,
    summary: `Updated profile for user ${id}`,
    newValue: cleanData,
  });
}

// ── Lessons ──
export interface LessonItem {
  id: string;
  textbookId?: string;
  chapterId?: string;
  title: string;
  contentType?: string;
  videoUrl?: string;
  content?: string;
  duration?: number;
  order?: number;
  quizId?: string;
  assignmentId?: string;
}

/** Fetch lessons belonging to a specific chapter. */
export async function getLessonsByChapter(chapterId: string): Promise<LessonItem[]> {
  const { data, error } = await supabase.from('lessons').select('*').eq('chapterId', chapterId);
  if (error) throw error;
  return (data || []) as LessonItem[];
}

/** Fetch a single lesson by id. */
export async function getLesson(id: string): Promise<LessonItem | null> {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as LessonItem | null;
}
