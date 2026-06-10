import { getCollection } from '../firebase/firestore';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';
import { parsePagination } from '../utils/pagination';

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
  | 'textbook.upload' | 'textbook.delete'
  | 'user.recover' | 'entity.recover';

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

/** List audit logs with optional action filter, paginated by timestamp desc. */
export async function listAuditLogs(query: { page?: string; limit?: string; action?: string }) {
  const { page, limit } = parsePagination(query);
  const baseQuery = getCollection('auditLogs').orderBy('timestamp', 'desc') as FirebaseFirestore.Query;

  let filteredQuery = baseQuery;
  if (query.action) {
    filteredQuery = baseQuery.where('action', '==', query.action);
  }

  const countSnapshot = await filteredQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await filteredQuery.offset(offset).limit(limit).get();

  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return { items, total, page, limit };
}

/** Fetch a single audit log by document ID. */
export async function getAuditLogById(logId: string) {
  const ref = getCollection('auditLogs').doc(logId);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Audit log not found');
  return { id: doc.id, ...doc.data() };
}

/** Recover a soft-deleted entity from its audit log oldValue snapshot. */
export async function recoverEntity(logId: string) {
  const log = await getAuditLogById(logId);
  const entry = log as unknown as AuditEntry;

  if (!entry.oldValue || typeof entry.oldValue !== 'object') {
    throw new Error('Audit log contains no oldValue snapshot to recover from');
  }

  const targetRef = getCollection(entry.targetType + 's').doc(entry.targetId);
  const existing = await targetRef.get();

  if (existing.exists) {
    throw new Error(`Target ${entry.targetType} "${entry.targetName}" still exists — no recovery needed`);
  }

  const restoreData = {
    ...entry.oldValue,
    isDeleted: false,
    recoveredAt: new Date().toISOString(),
    recoveredFromLog: logId,
  };

  await targetRef.set(restoreData);

  logger.info('Entity recovered from audit log', {
    logId,
    targetId: entry.targetId,
    targetType: entry.targetType,
  });

  return { id: entry.targetId, ...restoreData };
}
