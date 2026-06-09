import { getCollection } from '../firebase/firestore';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'subject.create' | 'subject.update' | 'subject.archive' | 'subject.delete'
  | 'class.create' | 'class.update' | 'class.archive' | 'class.delete'
  | 'course.create' | 'course.update' | 'course.archive' | 'course.delete'
  | 'lesson.create' | 'lesson.update' | 'lesson.delete'
  | 'assignment.create' | 'assignment.update' | 'assignment.delete'
  | 'exam.create' | 'exam.update' | 'exam.delete'
  | 'quiz.create' | 'quiz.update' | 'quiz.delete'
  | 'user.create' | 'user.update' | 'user.deactivate' | 'user.activate' | 'user.delete'
  | 'grade.update' | 'grade.bulk'
  | 'enrollment.create' | 'enrollment.delete'
  | 'role.change'
  | 'textbook.upload' | 'textbook.delete';

export interface AuditEntry {
  action: AuditAction;
  targetId: string;
  targetType: string;
  targetName: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  summary: string;
  timestamp: string;
}

export async function logAudit(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  const auditDoc: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  try {
    await getCollection('auditLogs').add(auditDoc);
    logger.info('Audit log created', { action: entry.action, targetId: entry.targetId });
  } catch (err) {
    logger.warn('Failed to write audit log', { error: err, action: entry.action });
  }
}

export function adminAuditEntry(
  req: { user?: { uid: string; role?: string; displayName?: string } },
  action: AuditAction,
  targetId: string,
  targetType: string,
  targetName: string,
  opts?: { oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null; summary?: string }
): Omit<AuditEntry, 'timestamp'> {
  return {
    action,
    targetId,
    targetType,
    targetName,
    performedBy: req.user?.uid || 'system',
    performedByName: req.user?.displayName || 'System',
    performedByRole: req.user?.role || 'system',
    oldValue: opts?.oldValue || null,
    newValue: opts?.newValue || null,
    summary: opts?.summary || `${action} on ${targetType} "${targetName}"`,
  };
}
