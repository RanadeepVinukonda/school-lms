import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { createBulkNotifications } from './notification.service';
import { getCurrentAcademicYear } from './academic-year.service';

interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: string;
  markedBy: string | null;
  note: string | null;
  markedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ── Public API ───────────────────────────────────────────

/** Mark attendance for multiple students with duplicate rejection and parent notifications. */
export async function markAttendance(data: {
  studentIds: string[];
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  markedBy: string;
  note?: string;
}) {
  const records: AttendanceRecord[] = [];
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Duplicate guard — check if any student already has attendance for this date
  const { data: existingRows, error: existingError } = await supabase
    .from('attendance')
    .select('student_id')
    .eq('class_id', data.classId)
    .eq('date', data.date);
  if (existingError) throw existingError;
  const existingStudentIds = new Set((existingRows || []).map((r: any) => r.student_id).filter(Boolean));

  for (const studentId of data.studentIds) {
    if (existingStudentIds.has(studentId)) {
      logger.info('Duplicate attendance skipped', { studentId, classId: data.classId, date: data.date });
      continue;
    }
    const { error: insertError } = await supabase.from('attendance').insert({
      id: uuidv4(), student_id: studentId, class_id: data.classId,
      date: data.date, status: data.status, marked_by: data.markedBy,
      note: data.note || '', marked_at: now, created_at: now, updated_at: now,
    });
    if (insertError) throw insertError;
    records.push({ studentId, classId: data.classId, date: data.date, status: data.status, markedBy: data.markedBy } as AttendanceRecord);
  }

  logger.info('Attendance marked', { classId: data.classId, date: data.date, count: records.length });

  if (records.length === 0) {
    return { skipped: true, message: 'Attendance already recorded for all selected students' };
  }

  // Send attendance notification to parents (non-blocking)
  try {
    const { data: students } = await supabase.from('users').select('id, display_name').in('id', data.studentIds);
    const studentNameMap: Record<string, string> = {};
    for (const s of students || []) studentNameMap[s.id] = s.display_name || s.id;

    const { data: parents } = await supabase.from('users').select('*').eq('role', 'parent').overlaps('children_ids', data.studentIds);
    const notifications: any[] = [];
    for (const parent of parents || []) {
      const childrenIds = (parent.children_ids || []) as string[];
      const matched = data.studentIds.filter((sid) => childrenIds.includes(sid));
      if (matched.length === 0) continue;
      notifications.push({
        userId: parent.id, type: 'attendance', title: 'Attendance Marked',
        body: `${data.status.charAt(0).toUpperCase() + data.status.slice(1)} for ${matched.map((sid) => studentNameMap[sid] || sid).join(', ')} on ${data.date}`,
        data: { classId: data.classId, date: data.date, status: data.status, studentIds: matched },
      });
    }
    if (notifications.length > 0) await createBulkNotifications(notifications);
  } catch (err) {
    logger.error('Attendance notifications failed (attendance itself succeeded)', {
      classId: data.classId, date: data.date,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return records;
}

/** Get attendance records for a class, optionally filtered by date. */
export async function getClassAttendance(classId: string, date?: string): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from('attendance').select('*').eq('class_id', classId);
  if (date) query = query.eq('date', date);
  const { data: rows, error } = await query;
  if (error) throw error;
  return (rows || []).map(toAttendanceResponse);
}

/** Get attendance records for a student, sorted by date descending. */
export async function getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('attendance').select('*').eq('student_id', studentId);
  if (error) throw error;
  const records = (rows || []).map(toAttendanceResponse);
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return records;
}

/** Get summary report for a class, using total working days as denominator. */
export async function getAttendanceReport(classId: string) {
  const supabase = getSupabaseAdmin();

  // Get all students enrolled in this class
  const { data: allStudents, error: studentError } = await supabase
    .from('users')
    .select('id, display_name, roll_no, student_id')
    .eq('role', 'student')
    .contains('class_ids', [classId]);
  if (studentError) throw studentError;

  const currentYear = getCurrentAcademicYear();
  const yearStart = currentYear?.startDate ? new Date(currentYear.startDate as string) : new Date();
  const yearEnd = new Date();

  // Calculate total working days (weekdays) from academic year start to today
  const workingDays = countWeekdays(yearStart, yearEnd);

  // Get all attendance records for this class
  const records = await getClassAttendance(classId);

  const filteredRecords = records.filter((r: any) => r.date && new Date(r.date) >= yearStart);

  // Build student name map
  const studentNameMap: Record<string, string> = {};
  const studentRollMap: Record<string, string> = {};
  for (const s of allStudents || []) {
    studentNameMap[s.id] = s.display_name || s.student_id || s.id;
    studentRollMap[s.id] = s.roll_no || '';
  }

  // Pre-process records per student for faster lookup
  const recordMap: Record<string, any[]> = {};
  for (const r of filteredRecords) {
    if (!recordMap[r.studentId]) recordMap[r.studentId] = [];
    recordMap[r.studentId].push(r);
  }

  const summary: Record<string, {
    studentId: string;
    studentName: string;
    rollNo: string;
    present: number;
    absent: number;
    late: number;
    holiday: number;
    total: number;
    percentage: number;
  }> = {};

  for (const student of allStudents || []) {
    const sid = student.id;
    const studentRecords = recordMap[sid] || [];
    const present = studentRecords.filter((r: any) => r.status === 'present').length;
    const lateCount = studentRecords.filter((r: any) => r.status === 'late').length;
    const holidayCount = studentRecords.filter((r: any) => r.status === 'holiday').length;
    const absent = studentRecords.filter((r: any) => r.status === 'absent').length;

    // Count unmarked days as absent
    const unmarkedDays = workingDays - studentRecords.length;
    const totalAbsent = absent + unmarkedDays;

    const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

    summary[sid] = {
      studentId: sid,
      studentName: studentNameMap[sid] || sid.slice(0, 8),
      rollNo: studentRollMap[sid] || '',
      present,
      absent: totalAbsent,
      late: lateCount,
      holiday: holidayCount,
      total: workingDays,
      percentage,
    };
  }

  return {
    records: filteredRecords,
    summary,
    yearStart: yearStart.toISOString(),
    yearEnd: yearEnd.toISOString(),
    workingDays,
  };
}

/** Export attendance as CSV. */
export async function exportAttendanceCSV(classId: string): Promise<string> {
  const records = await getClassAttendance(classId);
  const studentIds: string[] = [...new Set(records.map((r) => r.studentId))];
  const nameMap: Record<string, string> = {};
  if (studentIds.length > 0) {
    const supabase = getSupabaseAdmin();
    const { data: students } = await supabase.from('users').select('id, display_name').in('id', studentIds);
    for (const s of students || []) nameMap[s.id] = s.display_name || s.id;
  }
  function escapeCSV(val: string): string {
    if (/^[=+\-@\t]/.test(val)) val = `'${val}`;
    if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val.replace(/"/g, '""')}"`;
    return val;
  }

  const header = 'StudentId,StudentName,Date,Status,MarkedBy,Note,MarkedAt';
  const rows = records.map((r) =>
    [r.studentId, (nameMap[r.studentId] || r.studentId), r.date, r.status, r.markedBy || '', (r.note || ''), r.markedAt || ''].map((v) => escapeCSV(String(v))).join(','));
  return [header, ...rows].join('\n');
}

// ── Helpers ──────────────────────────────────────────────

function toAttendanceResponse(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    classId: row.class_id as string,
    date: row.date as string,
    status: row.status as string,
    markedBy: row.marked_by as string | null,
    note: row.note as string | null,
    markedAt: row.marked_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
