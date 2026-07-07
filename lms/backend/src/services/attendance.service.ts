import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { createBulkNotifications } from './notification.service';

export async function markAttendance(data: {
  studentIds: string[];
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  markedBy: string;
  note?: string;
}) {
  const records: any[] = [];
  const supabase = getSupabaseAdmin()!;

  // ponytail: duplicate guard — check if any student already has attendance for this date
  const { data: existingRows, error: existingError } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('class_id', data.classId)
    .eq('date', data.date);

  if (existingError) throw existingError;
  const existingStudentIds = new Set((existingRows || []).map((r: any) => r.student_id).filter(Boolean));

  const now = new Date().toISOString();

  for (const studentId of data.studentIds) {
    if (existingStudentIds.has(studentId)) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          status: data.status,
          marked_by: data.markedBy,
          note: data.note || '',
          marked_at: now,
          updated_at: now,
        })
        .eq('student_id', studentId)
        .eq('class_id', data.classId)
        .eq('date', data.date);
      if (updateError) throw updateError;

      records.push({ studentId, classId: data.classId, date: data.date, status: data.status, markedBy: data.markedBy, note: data.note || '', markedAt: now, updatedAt: now });
    } else {
      // Insert new record
      const id = uuidv4();
      const dbRecord = {
        id,
        student_id: studentId,
        class_id: data.classId,
        date: data.date,
        status: data.status,
        marked_by: data.markedBy,
        note: data.note || '',
        marked_at: now,
        created_at: now,
        updated_at: now,
      };
      const { error: insertError } = await supabase.from('attendance').insert(dbRecord);
      if (insertError) throw insertError;

      records.push({
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
      });
    }
  }

  logger.info('Attendance marked', { classId: data.classId, date: data.date, count: records.length });

  // Send attendance notification to parents
  try {
    // Fetch student names in a single query
    const studentNameMap: Record<string, string> = {};
    if (data.studentIds.length > 0) {
      const { data: students, error: studentError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', data.studentIds);

      if (studentError) throw studentError;
      for (const student of students || []) {
        studentNameMap[student.id] = student.display_name || student.id;
      }
    }

    // Find parents linked to any of these students in a filtered query
    let matchedParents: any[] = [];
    if (data.studentIds.length > 0) {
      const { data: parents, error: parentError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'parent')
        .overlaps('children_ids', data.studentIds);

      if (parentError) throw parentError;
      matchedParents = parents || [];
    }
    const notifications: Array<{ userId: string; type: string; title: string; body: string; data: Record<string, unknown> }> = [];

    for (const parent of matchedParents) {
      const parentData = { ...(parent.data as Record<string, unknown> || {}), id: parent.id, childrenIds: parent.children_ids || [] };
      const kids = (parentData.childrenIds || []) as string[];
      const matched = data.studentIds.filter((sid: string) => kids.includes(sid));
      if (matched.length === 0) continue;
      const names = matched.map((sid: string) => studentNameMap[sid] || sid).join(', ');
      notifications.push({
        userId: parent.id,
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
  const supabase = getSupabaseAdmin()!;
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('class_id', classId);

  if (date) {
    query = query.eq('date', date);
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  return (rows || []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    date: row.date,
    status: row.status,
    markedBy: row.marked_by,
    note: row.note,
    markedAt: row.marked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getStudentAttendance(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId);

  if (error) throw error;

  const records = (rows || []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    date: row.date,
    status: row.status,
    markedBy: row.marked_by,
    note: row.note,
    markedAt: row.marked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return records;
}

export async function getAttendanceReport(classId: string) {
  const records = await getClassAttendance(classId);

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

  // Resolve student names in a single query
  const studentIds: string[] = [...new Set(records.map((r: any) => r.studentId))];
  const nameMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const supabase = getSupabaseAdmin()!;
    const { data: students, error } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', studentIds);

    if (error) throw error;
    for (const student of students || []) {
      nameMap[student.id] = student.display_name || student.id;
    }
  }

  const header = 'StudentId,StudentName,Date,Status,MarkedBy,Note,MarkedAt';
  const rows = records.map((r: any) => {
    const name = (nameMap[r.studentId] || r.studentId).replace(/,/g, ';');
    return `${r.studentId},${name},${r.date},${r.status},${r.markedBy},${(r.note || '').replace(/,/g, ';')},${r.markedAt}`;
  });
  return [header, ...rows].join('\n');
}
