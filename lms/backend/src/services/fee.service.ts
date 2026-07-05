import { getSupabaseAdmin } from './supabase';
import { ValidationError } from '../utils/errors';

/**
 * Create a new fee schedule for a class.
 * @param data.name - Display name of the fee schedule
 * @param data.amount - Total fee amount in smallest currency unit
 * @param data.dueDate - Optional ISO date string for payment due date
 * @param data.classId - UUID of the target class
 * @param data.schoolId - UUID of the school
 * @returns The created fee_structure row
 */
export async function createFeeSchedule(data: {
  name: string; amount: number; dueDate?: string; classId: string; academicYear?: string; description?: string;
  schoolId: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: result } = await supabase.from('fee_structures').insert({
    school_id: data.schoolId, name: data.name, amount: data.amount, due_date: data.dueDate, class_id: data.classId,
  }).select().single();
  return result;
}

export async function listFeeSchedules(schoolId?: string, _academicYear?: string) {
  const supabase = getSupabaseAdmin()!;
  let q = supabase.from('fee_structures').select('*');
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data } = await q;
  return data || [];
}

export async function getFeeSchedule(id: string) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('fee_structures').select('*').eq('id', id).maybeSingle();
  return data;
}

/**
 * Record a fee payment for a student. Rejects overpayments with a ValidationError.
 * @param data.studentId - UUID of the student paying
 * @param data.feeScheduleId - UUID of the fee_structure being paid
 * @param data.amountPaid - Amount paid in this transaction
 * @returns The created fee_payment row
 * @throws {ValidationError} if payment would exceed the remaining balance
 */
export async function recordPayment(data: {
  studentId: string; feeScheduleId: string; amountPaid: number; paymentMethod?: string; schoolId?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: schedule } = await supabase.from('fee_structures').select('amount').eq('id', data.feeScheduleId).single();
  if (!schedule) return null;
  const feeAmount = Number(schedule.amount);
  const { data: existingPayments } = await supabase.from('fee_payments')
    .select('amount').eq('student_id', data.studentId).eq('fee_structure_id', data.feeScheduleId);
  const totalPaid = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const overpayment = totalPaid + data.amountPaid - feeAmount;
  if (overpayment > 0) {
    throw new ValidationError(
      `Payment of ${data.amountPaid} would overpay. Remaining balance: ${feeAmount - totalPaid}`
    );
  }
  const { data: result } = await supabase.from('fee_payments').insert({
    student_id: data.studentId, fee_structure_id: data.feeScheduleId, amount: data.amountPaid, school_id: data.schoolId,
  }).select().single();
  return result;
}

export async function getStudentPayments(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('fee_payments').select('*').eq('student_id', studentId);
  return data || [];
}

/**
 * Build an outstanding fees report: per-student breakdown of total due vs total paid.
 * @param schoolId - Optional school UUID to scope the report
 * @returns Array of {studentId, studentName, totalDue, totalPaid, balance}
 */
export async function getOutstandingReport(schoolId?: string) {
  const supabase = getSupabaseAdmin()!;

  let structQ = supabase.from('fee_structures').select('*');
  let studentQ = supabase.from('users').select('id, display_name').eq('role', 'student');
  let paymentQ = supabase.from('fee_payments').select('*');

  if (schoolId) {
    structQ = structQ.eq('school_id', schoolId);
    studentQ = studentQ.eq('school_id', schoolId);
    paymentQ = paymentQ.eq('school_id', schoolId);
  }

  const [{ data: structures }, { data: payments }, { data: students }] = await Promise.all([
    structQ, paymentQ, studentQ,
  ]);

  if (!structures || !students) return [];
  return buildOutstandingReport(structures, payments || [], students);
}

function buildOutstandingReport(structures: any[], payments: any[], students: any[]) {
  const report = (students || []).map((s: Record<string, unknown>) => {
    const totalDue = (structures || []).reduce((sum: number, f: Record<string, unknown>) => sum + Number(f.amount), 0);
    const studentPays = (payments || []).filter((p: Record<string, unknown>) => p.student_id === s.id);
    const totalPaid = studentPays.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0);
    return { studentId: s.id, studentName: s.display_name || s.id, totalDue, totalPaid, balance: totalDue - totalPaid };
  });
  return report.filter((r: { totalDue: number; totalPaid: number }) => r.totalDue > 0 || r.totalPaid > 0);
}
