import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function createSchedule(data: {
  templateId: string;
  title: string;
  description?: string;
  classId: string;
  subjectId: string;
  createdBy: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  requiresApproval?: boolean;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const templateSnap = await collections.testTemplates().doc(data.templateId).get();
  if (!templateSnap.exists) throw new NotFoundError('Template not found');
  const template = templateSnap.data()!;

  const scheduleData = {
    id,
    templateId: data.templateId,
    title: data.title,
    description: data.description || null,
    classId: data.classId,
    subjectId: data.subjectId,
    createdBy: data.createdBy,
    startDate: data.startDate,
    endDate: data.endDate,
    durationMinutes: data.durationMinutes,
    status: data.requiresApproval ? 'pending_approval' : 'scheduled' as string,
    approvedBy: null as string | null,
    approvedAt: null as string | null,
    config: template.config,
    requiresApproval: data.requiresApproval ?? false,
    totalStudents: 0,
    attemptedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collections.testSchedule().doc(id).set(scheduleData);
  logger.info('Test scheduled', { id, title: data.title });
  return scheduleData;
}

export async function approveSchedule(id: string, approverId: string) {
  const ref = collections.testSchedule().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Schedule not found');

  const data = doc.data()!;
  if (data.status !== 'pending_approval') throw new Error('Schedule is not pending approval');

  const now = new Date().toISOString();
  await ref.update({
    status: 'approved',
    approvedBy: approverId,
    approvedAt: now,
    updatedAt: now,
  });

  logger.info('Test schedule approved', { id, approverId });
  const updated = await ref.get();
  return { ...updated.data() };
}

export async function updateScheduleStatus(id: string, userId: string, status: string) {
  const ref = collections.testSchedule().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Schedule not found');
  const data = doc.data()!;
  if (data.createdBy !== userId) throw new ForbiddenError('Not your schedule');

  await ref.update({ status, updatedAt: new Date().toISOString() });
  logger.info('Test schedule status updated', { id, status });
  const updated = await ref.get();
  return { ...updated.data() };
}

export async function deleteSchedule(id: string, userId: string) {
  const ref = collections.testSchedule().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Schedule not found');
  if (doc.data()!.createdBy !== userId) throw new ForbiddenError('Not your schedule');
  await ref.delete();
  logger.info('Test schedule deleted', { id });
}

export async function getSchedule(id: string) {
  const ref = collections.testSchedule().doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError('Schedule not found');
  return { ...doc.data() };
}

export async function listSchedules(params: {
  classId?: string; subjectId?: string; createdBy?: string; status?: string;
}) {
  let query: FirebaseFirestore.Query = collections.testSchedule()
    .orderBy('createdAt', 'desc');

  if (params.classId) query = query.where('classId', '==', params.classId);
  if (params.subjectId) query = query.where('subjectId', '==', params.subjectId);
  if (params.createdBy) query = query.where('createdBy', '==', params.createdBy);
  if (params.status) query = query.where('status', '==', params.status);

  const snapshot = await query.get();
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
}
