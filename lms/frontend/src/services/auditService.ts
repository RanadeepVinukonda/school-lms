import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';

export type AuditAction =
  | 'subject.create' | 'subject.update' | 'subject.archive' | 'subject.delete'
  | 'class.create' | 'class.update' | 'class.archive' | 'class.delete'
  | 'user.create' | 'user.update' | 'user.deactivate' | 'user.activate' | 'user.delete'
  | 'exam.create' | 'exam.update' | 'exam.delete'
  | 'assignment.create' | 'assignment.update' | 'assignment.delete'
  | 'textbook.create' | 'textbook.update' | 'textbook.delete' | 'textbook.chapters.save'
  | 'concept.release'
  | 'enrollment.create'
  | 'profile.update'
  | 'timetable.create' | 'timetable.update' | 'timetable.delete'
  | 'teacher.class.assignment'
  | 'student.roll.assignment';

export interface AuditEntry {
  action: AuditAction;
  targetId: string;
  targetType: string;
  targetName: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  oldValue?: unknown;
  newValue?: unknown;
  summary: string;
  timestamp: string;
}

/** Log an auditable action to Firestore. */
export async function logAudit(entry: Omit<AuditEntry, 'performedBy' | 'performedByName' | 'performedByRole' | 'timestamp'>): Promise<void> {
  const user = useAuthStore.getState().user;
  const auditDoc: AuditEntry = {
    ...entry,
    performedBy: user?.id || 'unknown',
    performedByName: user?.displayName || 'Unknown',
    performedByRole: user?.role || 'unknown',
    timestamp: Timestamp.now().toDate().toISOString(),
  };
  try {
    await addDoc(collection(db, 'auditLogs'), auditDoc);
  } catch {
    // Silent — audit failures must never block the user's operation
  }
}
