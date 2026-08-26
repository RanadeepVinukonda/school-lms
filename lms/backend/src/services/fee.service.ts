import { getSupabaseAdmin } from './supabase';
import { getConnectionPool } from '../database/connection-manager';
import { ValidationError } from '../utils/errors';
import { BaseService, DbRecord } from '../lib/base-service';
import { getCurrentAcademicYear } from './academic-year.service';
import { createBulkNotifications } from './notification.service';
import { logger } from '../utils/logger';
import { buildOutstandingReport } from '../utils/fee-report';
import { feeCache } from '../utils/cache';

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
    academic_year: data.academicYear || (await getCurrentAcademicYear()).name,
    description: data.description || null,
  } as Partial<FeeStructureRecord>);
  // notify students and parents in the class
  notifyFeeReminder(data.schoolId, data.classId, data.name, data.dueDate)
    .catch((err) => logger.warn('Failed to notify fee reminder', { error: err?.message || err }));
  feeCache.invalidatePattern(`.*${data.schoolId}.*`);
  return result;
}

async function notifyFeeReminder(schoolId: string, classId: string, name: string, dueDate?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { data: students } = await supabase
    .from('users').select('id').eq('school_id', schoolId).eq('class_id', classId).eq('role', 'student');
  const userIds: string[] = (students || []).map(s => s.id as string);
  const { data: parents } = await supabase
    .from('users').select('id, children_ids').eq('school_id', schoolId).eq('role', 'parent');
  if (parents) {
    for (const p of parents) {
      if ((Array.isArray(p.children_ids) ? (p.children_ids as string[]) : []).some(kid => userIds.includes(kid))) {
        userIds.push(p.id as string);
      }
    }
  }
  if (userIds.length === 0) return;
  try {
    await createBulkNotifications(userIds.map(uid => ({
      userId: uid, type: 'fee_reminder', title: 'Fee Reminder', body: `${name}: Please pay before ${dueDate || 'the due date'}.`,
    })));
  } catch (err) {
    logger.error('Failed to create fee reminder notifications', { error: err instanceof Error ? err.message : String(err) });
  }
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
    limit: 1000,
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(classId ? { class_id: classId } : {}),
  });
  return result.items;
}

/**
 * Get a single fee schedule by id, scoped to a school.
 */
export async function getFeeSchedule(id: string, schoolId?: string): Promise<FeeStructureRecord | null> {
  const record = await feeBase.findById(id);
  if (!record) return null;
  if (schoolId && record.school_id && record.school_id !== schoolId) {
    throw new ValidationError('Fee schedule not found in this school');
  }
  return record;
}

/**
 * Update an existing fee schedule.
 */
export async function updateFeeSchedule(
  id: string,
  data: {
    name?: string;
    amount?: number;
    dueDate?: string;
    classId?: string;
    academicYear?: string;
    description?: string;
  },
  schoolId?: string,
): Promise<FeeStructureRecord> {
  if (schoolId) {
    const existing = await feeBase.findById(id);
    if (!existing) throw new ValidationError('Fee schedule not found');
    if (existing.school_id && existing.school_id !== schoolId) {
      throw new ValidationError('Fee schedule not found in this school');
    }
  }
  const result = await feeBase.update(id, {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.amount !== undefined ? { amount: data.amount } : {}),
    ...(data.dueDate !== undefined ? { due_date: data.dueDate || null } : {}),
    ...(data.classId !== undefined ? { class_id: data.classId } : {}),
    ...(data.academicYear !== undefined ? { academic_year: data.academicYear } : {}),
    ...(data.description !== undefined ? { description: data.description || null } : {}),
  } as Partial<FeeStructureRecord>);
  feeCache.clear();
  return result;
}

/**
 * Delete a fee schedule.
 * Refuses to delete schedules that already have payments recorded against them.
 */
export async function deleteFeeSchedule(id: string, schoolId?: string): Promise<void> {
  if (schoolId) {
    const existing = await feeBase.findById(id);
    if (!existing) throw new ValidationError('Fee schedule not found');
    if (existing.school_id && existing.school_id !== schoolId) {
      throw new ValidationError('Fee schedule not found in this school');
    }
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase admin client unavailable');
  const { count, error } = await supabase
    .from('fee_payments')
    .select('id', { count: 'exact', head: true })
    .eq('fee_structure_id', id);
  if (error) throw new Error(`Failed to check fee schedule payments: ${error.message}`);
  if (count && count > 0) {
    throw new ValidationError('Cannot delete this fee schedule because payments have already been recorded against it.');
  }
  await feeBase.delete(id);
  feeCache.clear();
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
  transactionId?: string;
  status?: string;
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
    feeCache.clear();
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
export async function getStudentPayments(studentId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let query = supabase.from('fee_payments').select('*').eq('student_id', studentId);
  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get student payments: ${error.message}`);
  return data || [];
}

/**
 * Build an outstanding fees report: per-student breakdown of total due vs total paid.
 */
export async function getOutstandingReport(schoolId?: string) {
  const supabase = getSupabaseAdmin()!;
  const pageSize = 1000;

  async function fetchAll(builder: () => any): Promise<any[]> {
    const all: any[] = [];
    let from = 0;
    for (;;) {
      const query = builder().range(from, from + pageSize - 1);
      const { data, error } = await query;
      if (error) throw new Error(`Failed to load outstanding report: ${error.message}`);
      all.push(...(data || []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const [structures, payments, students] = await Promise.all([
    fetchAll(() => {
      let q = supabase.from('fee_structures').select('*');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
    fetchAll(() => {
      let q = supabase.from('fee_payments').select('*');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
    fetchAll(() => {
      let q = supabase.from('users').select('id, display_name, class_id, class_ids').eq('role', 'student').is('deleted_at', null);
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
  ]);

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

  return buildOutstandingReport(structures, payments, students, classMap);
}
