import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/adapter';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getAdminFirestore } from '../database/admin';
import { createBulkNotifications } from './notification.service';
import type { AttendanceCollection } from '../database/interfaces/collections';

let _attendanceCollection: AttendanceCollection | null = null;
export function setAttendanceCollection(col: AttendanceCollection): void { _attendanceCollection = col; }
function attendanceCol() { return _attendanceCollection ?? (collections.attendance() as unknown as AttendanceCollection); }

export async function markAttendance(data: {
  studentIds: string[];
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  markedBy: string;
  note?: string;
}) {
  const batch = getAdminFirestore().batch();
  const records: any[] = [];

  for (const studentId of data.studentIds) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const record = {
      id,
      studentId,
      classId: data.classId,
      date: data.date,
      status: data.status,
      markedBy: data.markedBy,
      note: data.note || '',
      markedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    batch.create(collections.attendance().doc(id), record);
    records.push(record);
  }

  await batch.commit();
  logger.info('Attendance marked', { classId: data.classId, date: data.date, count: data.studentIds.length });

  // Send attendance notification to parents
  try {
    // Fetch student names
    const studentDocs = await Promise.all(
      data.studentIds.map((sid: string) =>
        collections.users().doc(sid).get().catch((err) => {
          logger.warn('Failed to fetch student for attendance notification', { studentId: sid, error: err instanceof Error ? err.message : String(err) });
          return null;
        }),
      ),
    );
    const studentNameMap: Record<string, string> = {};
    for (const snap of studentDocs) {
      if (snap && snap.exists) studentNameMap[snap.id] = snap.data()?.displayName || snap.id;
    }

    // Find parents linked to any of these students
    const allParents = await collections.users().where('role', '==', 'parent').get();
    const notifications: Array<{ userId: string; type: string; title: string; body: string; data: Record<string, unknown> }> = [];

    for (const doc of allParents.docs) {
      const kids = (doc.data().childrenIds || []) as string[];
      const matched = data.studentIds.filter((sid: string) => kids.includes(sid));
      if (matched.length === 0) continue;
      const names = matched.map((sid: string) => studentNameMap[sid] || sid).join(', ');
      notifications.push({
        userId: doc.id,
        type: 'attendance',
        title: 'Attendance Marked',
        body: `${data.status.charAt(0).toUpperCase() + data.status.slice(1)} for ${names} on ${data.date}`,
        data: { classId: data.classId, date: data.date, status: data.status, studentIds: matched },
      });
    }

    if (notifications.length > 0) {
      await createBulkNotifications(notifications);
      logger.info('Attendance notifications sent to parents', { count: notifications.length });
    }
  } catch (err) {
    logger.error('Failed to send attendance notifications', { error: err });
  }

  return records;
}

export async function getClassAttendance(classId: string, date?: string) {
  let query = collections.attendance().where('classId', '==', classId);
  if (date) {
    query = query.where('date', '==', date);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Record<string, unknown> & { id: string }));
}

export async function getStudentAttendance(studentId: string) {
  const snapshot = await collections.attendance()
    .where('studentId', '==', studentId)
    .get();
  const records: any[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return records;
}

export async function getAttendanceReport(classId: string) {
  const snapshot = await collections.attendance().where('classId', '==', classId).get();
  const records: any[] = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  const summary: Record<string, { present: number; absent: number; late: number; holiday: number; total: number }> = {};

  for (const r of records) {
    const sid = r.studentId as string;
    if (!summary[sid]) {
      summary[sid] = { present: 0, absent: 0, late: 0, holiday: 0, total: 0 };
    }
    summary[sid][r.status as 'present' | 'absent' | 'late' | 'holiday']++;
    summary[sid].total++;
  }

  return { records, summary };
}

export async function exportAttendanceCSV(classId: string): Promise<string> {
  const records = await getClassAttendance(classId);

  // Resolve student names
  const studentIds: string[] = [...new Set(records.map((r: any) => r.studentId))];
  const studentSnaps = await Promise.all(
    studentIds.map((sid: string) =>
      collections.users().doc(sid).get().catch((err) => {
        logger.warn('Failed to fetch student name for attendance CSV', { studentId: sid, error: err instanceof Error ? err.message : String(err) });
        return null;
      }),
    ),
  );
  const nameMap: Record<string, string> = {};
  for (const snap of studentSnaps) {
    if (snap?.exists) nameMap[snap.id] = snap.data()?.displayName || snap.id;
  }

  const header = 'StudentId,StudentName,Date,Status,MarkedBy,Note,MarkedAt';
  const rows = records.map((r: any) => {
    const name = (nameMap[r.studentId] || r.studentId).replace(/,/g, ';');
    return `${r.studentId},${name},${r.date},${r.status},${r.markedBy},${(r.note || '').replace(/,/g, ';')},${r.markedAt}`;
  });
  return [header, ...rows].join('\n');
}
