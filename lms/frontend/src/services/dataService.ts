import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface Subject {
  id: string;
  name: string;
  code: string;
  icon?: string;
  color?: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
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
  grade?: string;
  section?: string;
  academicYear?: string;
  roomNumber?: string;
  teacherIds?: string[];
  subjectIds?: string[];
  studentCount?: number;
  status?: string;
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
  createdAt: string;
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

export async function getAllSubjects(): Promise<Subject[]> {
  const q = query(collection(db, SUBJECTS_COLLECTION));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
}

export async function getSubject(id: string): Promise<Subject | null> {
  const docRef = doc(db, SUBJECTS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Subject;
}

export async function getStudentsByClass(classId: string): Promise<UserDoc[]> {
  const q = query(collection(db, 'users'), where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc));
}

export async function createEnrollment(studentId: string, courseId: string): Promise<void> {
  const eid = `${courseId}_${studentId}`;
  await setDoc(doc(db, ENROLLMENT_COLLECTION, eid), {
    studentId,
    courseId,
    status: 'active',
    progress: 0,
    enrolledAt: Timestamp.now().toDate().toISOString(),
  });
}

export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const q = query(collection(db, ENROLLMENT_COLLECTION), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Enrollment));
}

export async function getClassesByIds(ids: string[]): Promise<ClassEntry[]> {
  if (ids.length === 0) return [];
  const q = query(collection(db, CLASSES_COLLECTION), where('__name__', 'in', ids));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as ClassEntry));
}

export async function getClass(id: string): Promise<ClassEntry | null> {
  const docRef = doc(db, CLASSES_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as unknown as ClassEntry;
}

export async function getAllClasses(): Promise<ClassEntry[]> {
  const snap = await getDocs(collection(db, CLASSES_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as ClassEntry));
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const snap = await getDocs(collection(db, ENROLLMENT_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Enrollment));
}

export async function getAllGrades(): Promise<GradeEntry[]> {
  const snap = await getDocs(collection(db, GRADES_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GradeEntry));
}

export async function getGradesByStudent(studentId: string): Promise<GradeEntry[]> {
  const q = query(collection(db, GRADES_COLLECTION), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as GradeEntry));
}

export async function getNotificationsByUser(userId: string): Promise<NotificationItem[]> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  await updateDoc(docRef, { read: true, readAt: Timestamp.now().toDate().toISOString() });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  const batch = snap.docs.map((d) => updateDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id), {
    read: true,
    readAt: Timestamp.now().toDate().toISOString(),
  }));
  await Promise.all(batch);
}

// ── Assignments ──
export interface AssignmentItem {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  textbookId?: string;
  lessonId?: string;
  dueDate?: string;
  points?: number;
  status?: string;
  submissionCount?: number;
  createdAt?: string;
}

export async function getAssignmentsBySubject(subjectId: string): Promise<AssignmentItem[]> {
  const q = query(collection(db, 'assignments'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignmentItem));
}

export async function getAssignment(id: string): Promise<AssignmentItem | null> {
  const snap = await getDoc(doc(db, 'assignments', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AssignmentItem;
}

// ── Submissions ──
export interface SubmissionItem {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string;
  submittedAt?: string;
  status?: string;
  grade?: number;
  feedback?: string;
}

export async function getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionItem[]> {
  const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubmissionItem));
}

// ── Exams ──
export interface ExamItem {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  duration?: number;
  questions?: unknown[];
  status?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export async function getExamsBySubject(subjectId: string): Promise<ExamItem[]> {
  const q = query(collection(db, 'exams'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamItem));
}

export async function getExam(id: string): Promise<ExamItem | null> {
  const snap = await getDoc(doc(db, 'exams', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as ExamItem;
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

export async function getCorrectionsByStudent(studentId: string): Promise<CorrectionItem[]> {
  const q = query(collection(db, 'corrections'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CorrectionItem));
}

export async function getCorrectionsByExam(examId: string): Promise<CorrectionItem[]> {
  const q = query(collection(db, 'corrections'), where('examId', '==', examId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CorrectionItem));
}

// ── Quizzes ──
export interface QuizItem {
  id: string;
  title: string;
  description?: string;
  lessonId?: string;
  chapterId?: string;
  textbookId?: string;
  timeLimit?: number;
  questions?: unknown[];
  status?: string;
}

export async function getQuiz(id: string): Promise<QuizItem | null> {
  const snap = await getDoc(doc(db, 'quizzes', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as QuizItem;
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
}

export async function getTimetableByClass(classId: string): Promise<TimetableEntry[]> {
  const q = query(collection(db, 'timetable'), where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableEntry));
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
  avatar?: string;
  phone?: string;
  bio?: string;
  address?: string;
  dateOfBirth?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getUserByRole(role: string): Promise<UserDoc[]> {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc));
}

export async function getUser(id: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserDoc;
}

export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserDoc));
}

export async function updateUser(id: string, data: Partial<UserDoc>): Promise<void> {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  await setDoc(doc(db, 'users', id), {
    ...cleanData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
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

export async function getLessonsByChapter(chapterId: string): Promise<LessonItem[]> {
  const q = query(collection(db, 'lessons'), where('chapterId', '==', chapterId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LessonItem));
}

export async function getLesson(id: string): Promise<LessonItem | null> {
  const snap = await getDoc(doc(db, 'lessons', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LessonItem;
}
