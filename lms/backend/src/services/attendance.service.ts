import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getAdminFirestore } from '../firebase/admin';

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
  return records;
}

export async function getClassAttendance(classId: string, date?: string) {
  let query: FirebaseFirestore.Query = collections.attendance().where('classId', '==', classId);
  if (date) {
    query = query.where('date', '==', date);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as any));
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
  const header = 'StudentId,Date,Status,MarkedBy,Note,MarkedAt';
  const rows = records.map((r: any) =>
    `${r.studentId},${r.date},${r.status},${r.markedBy},${(r.note || '').replace(/,/g, ';')},${r.markedAt}`
  );
  return [header, ...rows].join('\n');
}
