import { getAdminFirestore } from './admin';
import type { CollectionReference, Firestore } from 'firebase-admin/firestore';

const db = getAdminFirestore();

export function getDb(): Firestore {
  return db;
}

export function getCollection(name: string): CollectionReference {
  return db.collection(name);
}

export const collections = {
  users: () => getCollection('users'),
  courses: () => getCollection('courses'),
  lessons: () => getCollection('lessons'),
  assignments: () => getCollection('assignments'),
  submissions: () => getCollection('submissions'),
  quizzes: () => getCollection('quizzes'),
  quizAttempts: () => getCollection('quizAttempts'),
  exams: () => getCollection('exams'),
  examAttempts: () => getCollection('examAttempts'),
  grades: () => getCollection('grades'),
  conversations: () => getCollection('conversations'),
  messages: () => getCollection('messages'),
  notifications: () => getCollection('notifications'),
  classes: () => getCollection('classes'),
  subjects: () => getCollection('subjects'),
  activityLogs: () => getCollection('activityLogs'),
  settings: () => getCollection('settings'),
  uploads: () => getCollection('uploads'),
  enrollment: () => getCollection('enrollment'),
  tokens: () => getCollection('tokens'),
  auditLogs: () => getCollection('auditLogs'),
  timetable: () => getCollection('timetable'),
  textbooks: () => getCollection('textbooks'),
  teacherClassSubject: () => getCollection('teacherClassSubject'),
  teacherVideos: () => getCollection('teacherVideos'),
  assignmentSubmissions: () => getCollection('assignmentSubmissions'),
};
