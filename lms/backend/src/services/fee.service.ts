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
  const { data: result, error } = await supabase.from('fee_structures').insert({
    school_id: data.schoolId, name: data.name, amount: data.amount, due_date: data.dueDate,
    class_id: data.classId, academic_year: data.academicYear || null, description: data.description || null,
  }).select().single();
  if (error) throw new Error(`Failed to create fee schedule: ${error.message}`);
  return result;
}

export async function listFeeSchedules(schoolId?: string, academicYear?: string, classId?: string) {
  const supabase = getSupabaseAdmin()!;
  let q = supabase.from('fee_structures').select('*');
  if (schoolId) q = q.eq('school_id', schoolId);
  if (academicYear) q = q.eq('academic_year', academicYear);
  if (classId) q = q.eq('class_id', classId);
  const { data, error } = await q;
  if (error) throw new Error(`Failed to list fee schedules: ${error.message}`);
  return data || [];
}

export async function getFeeSchedule(id: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('fee_structures').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to get fee schedule: ${error.message}`);
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
  const { data: schedule, error: schedErr } = await supabase.from('fee_structures').select('amount').eq('id', data.feeScheduleId).single();
  if (schedErr) throw new Error(`Fee schedule not found: ${schedErr.message}`);
  if (!schedule) return null;
  const feeAmount = Number(schedule.amount);
  const { data: existingPayments, error: payErr } = await supabase.from('fee_payments')
    .select('amount').eq('student_id', data.studentId).eq('fee_structure_id', data.feeScheduleId);
  if (payErr) throw new Error(`Failed to lookup payments: ${payErr.message}`);
  const totalPaid = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const overpayment = totalPaid + data.amountPaid - feeAmount;
  if (overpayment > 0) {
    throw new ValidationError(
      `Payment of ${data.amountPaid} would overpay. Remaining balance: ${feeAmount - totalPaid}`
    );
  }
  const { data: result, error } = await supabase.from('fee_payments').insert({
    student_id: data.studentId, fee_structure_id: data.feeScheduleId, amount: data.amountPaid, school_id: data.schoolId,
  }).select().single();
  if (error) throw new Error(`Failed to record payment: ${error.message}`);
  return result;
}

export async function getStudentPayments(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('fee_payments').select('*').eq('student_id', studentId);
  if (error) throw new Error(`Failed to get student payments: ${error.message}`);
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
  let studentQ = supabase.from('users').select('id, display_name, class_id, class_ids').eq('role', 'student');
  let paymentQ = supabase.from('fee_payments').select('*');

  if (schoolId) {
    structQ = structQ.eq('school_id', schoolId);
    studentQ = studentQ.eq('school_id', schoolId);
    paymentQ = paymentQ.eq('school_id', schoolId);
  }

  const results = await Promise.all([
    structQ, paymentQ, studentQ,
  ]);

  for (const r of results) {
    if (r.error) throw new Error(`Failed to load outstanding report: ${r.error.message}`);
  }

  const [structures, payments, students] = results.map(r => r.data);
  if (!structures || !students) return [];

  // Fetch class names for display
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
