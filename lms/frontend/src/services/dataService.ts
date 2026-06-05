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
