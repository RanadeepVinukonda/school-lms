import { getSupabaseAdmin } from './supabase';
import { Pool } from 'pg';

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return new Pool({ connectionString: url, max: 1 });
}

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

export async function recordPayment(data: {
  studentId: string; feeScheduleId: string; amountPaid: number; paymentMethod?: string; schoolId?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  // ponytail: overpayment prevention
  const { data: schedule } = await supabase.from('fee_structures').select('amount').eq('id', data.feeScheduleId).single();
  if (!schedule) return null;
  const feeAmount = Number(schedule.amount);
  const { data: existingPayments } = await supabase.from('fee_payments')
    .select('amount').eq('student_id', data.studentId).eq('fee_structure_id', data.feeScheduleId);
  const totalPaid = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const overpayment = totalPaid + data.amountPaid - feeAmount;
  if (overpayment > 0) {
    return null; // ponytail: reject overpayment, caller gets null
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

export async function getOutstandingReport(schoolId?: string) {
  const supabase = getSupabaseAdmin()!;
  const pool = getPool();
  // ponytail: wrap three queries in a transaction for consistency
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      const { rows: structures } = schoolId
        ? await client.query('SELECT * FROM fee_structures WHERE school_id = $1', [schoolId])
        : await client.query('SELECT * FROM fee_structures');
      const { rows: payments } = schoolId
        ? await client.query('SELECT * FROM fee_payments WHERE school_id = $1', [schoolId])
        : await client.query('SELECT * FROM fee_payments');
      const { rows: students } = schoolId
        ? await client.query("SELECT id, display_name FROM users WHERE role = 'student' AND school_id = $1", [schoolId])
        : await client.query("SELECT id, display_name FROM users WHERE role = 'student'");
      await client.query('COMMIT');
      return buildOutstandingReport(structures, payments, students);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  // ponytail: fallback — parallel reads, no isolation
  let structQ = supabase.from('fee_structures').select('*');
  let studentQ = supabase.from('users').select('id, display_name').eq('role', 'student');
  let paymentQ = supabase.from('fee_payments').select('*');
  if (schoolId) {
    structQ = structQ.eq('school_id', schoolId);
    studentQ = studentQ.eq('school_id', schoolId);
    paymentQ = paymentQ.eq('school_id', schoolId);
  }
  const [{ data: structures }, { data: payments }, { data: students }] = await Promise.all([structQ, paymentQ, studentQ]);
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
