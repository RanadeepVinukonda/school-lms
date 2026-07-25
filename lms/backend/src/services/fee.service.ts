import { getSupabaseAdmin } from './supabase';
import { getConnectionPool } from '../database/connection-manager';
import { ValidationError } from '../utils/errors';
import { BaseService, DbRecord } from '../lib/base-service';
import { deriveAcademicYear } from '../middlewares/academicYear.middleware';
import { createBulkNotifications } from './notification.service';
import { logger } from '../utils/logger';

interface FeeStructureRecord extends DbRecord {
  school_id?: string;
  name: string;
  amount: number;
  due_date?: string;
  class_id?: string;
  academic_year?: string;
  description?: string;
}

/**
 * BaseService wrapper for fee_structures CRUD.
 */
class FeeBaseService extends BaseService<FeeStructureRecord> {
  protected table = 'fee_structures';
  protected softDelete = false;
  protected defaultSortColumn = 'created_at';
  protected defaultSortOrder: 'asc' | 'desc' = 'desc';
}

const feeBase = new FeeBaseService();

/**
 * Create a new fee schedule for a class.
 */
export async function createFeeSchedule(data: {
  name: string;
  amount: number;
  dueDate?: string;
  classId: string;
  academicYear?: string;
  description?: string;
  schoolId: string;
}): Promise<FeeStructureRecord> {
  const result = await feeBase.create({
    school_id: data.schoolId,
    name: data.name,
    amount: data.amount,
    due_date: data.dueDate || null,
    class_id: data.classId,
    academic_year: data.academicYear || deriveAcademicYear(),
    description: data.description || null,
  } as Partial<FeeStructureRecord>);
  // notify students and parents in the class
  notifyFeeReminder(data.schoolId, data.classId, data.name, data.dueDate)
    .catch((err) => logger.warn('Failed to notify fee reminder', { error: err?.message || err }));
  return result;
}

async function notifyFeeReminder(schoolId: string, classId: string, name: string, dueDate?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const dueText = dueDate ? ` due by ${dueDate}` : '';
  const { data: students } = await supabase
    .from('users').select('id').eq('school_id', schoolId).eq('class_id', classId).eq('role', 'student');
  const userIds: string[] = (students || []).map(s => s.id as string);
  const { data: parents } = await supabase
    .from('users').select('id, children_ids').eq('school_id', schoolId).eq('role', 'parent');
  if (parents) {
    for (const p of parents) {
      if ((p.children_ids as string[] || []).some(kid => userIds.includes(kid))) {
        userIds.push(p.id as string);
      }
    }
  }
  if (userIds.length === 0) return;
  await createBulkNotifications(userIds.map(uid => ({
    userId: uid, type: 'fee_reminder', title: 'Fee Reminder', body: `${name}: Please pay before ${dueDate || 'the due date'}.`,
  })));
}

/**
 * List fee schedules with optional filters.
 */
export async function listFeeSchedules(
  schoolId?: string,
  academicYear?: string,
  classId?: string
): Promise<FeeStructureRecord[]> {
  const result = await feeBase.list({
    schoolId,
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(classId ? { class_id: classId } : {}),
  });
  return result.items;
}

/**
 * Get a single fee schedule by id.
 */
export async function getFeeSchedule(id: string): Promise<FeeStructureRecord | null> {
  return feeBase.findById(id);
}

/**
 * Record a fee payment for a student inside an ACID transaction.
 * Uses raw SQL via getConnectionPool() to guarantee atomic read-then-write.
 */
export async function recordPayment(data: {
  studentId: string;
  feeScheduleId: string;
  amountPaid: number;
  paymentMethod?: string;
  schoolId?: string;
}) {
  const pool = getConnectionPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: schedules } = await client.query(
      `SELECT amount FROM fee_structures WHERE id = $1 LIMIT 1`,
      [data.feeScheduleId],
    );
    if (!schedules.length) throw new Error('Fee schedule not found');
    const feeAmount = Number(schedules[0].amount);

    const { rows: existingPayments } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM fee_payments WHERE student_id = $1 AND fee_structure_id = $2`,
      [data.studentId, data.feeScheduleId],
    );
    const totalPaid = Number(existingPayments[0]?.total_paid || 0);
    const overpayment = totalPaid + data.amountPaid - feeAmount;
    if (overpayment > 0) {
      await client.query('ROLLBACK');
      throw new ValidationError(
        `Payment of ${data.amountPaid} would overpay. Remaining balance: ${feeAmount - totalPaid}`
      );
    }

    const { rows: result } = await client.query(
      `INSERT INTO fee_payments (student_id, fee_structure_id, amount, school_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.studentId, data.feeScheduleId, data.amountPaid, data.schoolId || null],
    );

    await client.query('COMMIT');
    return result[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof ValidationError) throw err;
    throw new Error(`Failed to record payment: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    client.release();
  }
}

/**
 * Get payments for a specific student.
 */
export async function getStudentPayments(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('fee_payments').select('*').eq('student_id', studentId);
  if (error) throw new Error(`Failed to get student payments: ${error.message}`);
  return data || [];
}

/**
 * Build an outstanding fees report: per-student breakdown of total due vs total paid.
 */
export async function getOutstandingReport(schoolId?: string) {
  const supabase = getSupabaseAdmin()!;

  let structQ = supabase.from('fee_structures').select('*');
  let studentQ = supabase.from('users').select('id, display_name, class_id, class_ids').eq('role', 'student').is('deleted_at', null);
  let paymentQ = supabase.from('fee_payments').select('*');

  if (schoolId) {
    structQ = structQ.eq('school_id', schoolId);
    studentQ = studentQ.eq('school_id', schoolId);
    paymentQ = paymentQ.eq('school_id', schoolId);
  }

  const results = await Promise.all([structQ, paymentQ, studentQ]);

  for (const r of results) {
    if (r.error) throw new Error(`Failed to load outstanding report: ${r.error.message}`);
  }

  const [structures, payments, students] = results.map(r => r.data);
  if (!structures || !students) return [];

  const classIds = [...new Set(students.map((s: any) => s.class_id).filter(Boolean))];
  let classMap: Record<string, string> = {};
  if (classIds.length > 0) {
    const { data: classes } = await supabase.from('classes').select('id, name, grade, section').in('id', classIds);
    if (classes) {
      for (const c of classes) {
        classMap[c.id] = c.name || (c.grade && c.section ? `Class ${c.grade}-${c.section}` : c.id);
      }
    }
  }

  return buildOutstandingReport(structures, payments || [], students, classMap);
}

function buildOutstandingReport(structures: any[], payments: any[], students: any[], classMap: Record<string, string>) {
  const report = (students || []).map((s: any) => {
    const studentClassId = s.class_id || (s.class_ids?.[0]);
    const classStructures = (structures || []).filter((f: any) =>
      !f.class_id || f.class_id === studentClassId
    );
    const totalDue = classStructures.reduce((sum: number, f: any) => sum + Number(f.amount), 0);
    const studentPays = (payments || []).filter((p: any) => p.student_id === s.id);
    const totalPaid = studentPays.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    return {
      studentId: s.id,
      studentName: s.display_name || s.id,
      className: classMap[studentClassId] || '-',
      totalDue,
      totalPaid,
      balance: totalDue - totalPaid,
    };
  });
  return report.filter((r: { totalDue: number; totalPaid: number }) => r.totalDue > 0 || r.totalPaid > 0);
}
