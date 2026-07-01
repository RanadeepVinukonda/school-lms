import { getSupabaseAdmin } from './supabase';

export async function createFeeSchedule(data: {
  name: string; amount: number; dueDate?: string; classId: string; academicYear?: string; description?: string;
  schoolId: string;
}) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('fee_structures').insert({
    school_id: data.schoolId, name: data.name, amount: data.amount, due_date: data.dueDate,
  }).select().single();
  return result;
}

export async function listFeeSchedules(schoolId?: string, _academicYear?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let q = supabase.from('fee_structures').select('*');
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data } = await q;
  return data || [];
}

export async function getFeeSchedule(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('fee_structures').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function recordPayment(data: {
  studentId: string; feeScheduleId: string; amountPaid: number; paymentMethod?: string; schoolId?: string;
}) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('fee_payments').insert({
    student_id: data.studentId, fee_structure_id: data.feeScheduleId, amount: data.amountPaid, school_id: data.schoolId,
  }).select().single();
  return result;
}

export async function getStudentPayments(studentId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('fee_payments').select('*').eq('student_id', studentId);
  return data || [];
}

export async function getOutstandingReport(schoolId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let structQ = supabase.from('fee_structures').select('*');
  let studentQ = supabase.from('users').select('id, display_name').eq('role', 'student');
  let paymentQ = supabase.from('fee_payments').select('*');
  if (schoolId) {
    structQ = structQ.eq('school_id', schoolId);
    studentQ = studentQ.eq('school_id', schoolId);
    paymentQ = paymentQ.eq('school_id', schoolId);
  }
  const { data: structures } = await structQ;
  const { data: payments } = await paymentQ;
  const { data: students } = await studentQ;
  if (!structures || !students) return [];
  const report = (students || []).map((s: Record<string, unknown>) => {
    const totalDue = (structures || []).reduce((sum: number, f: Record<string, unknown>) => sum + Number(f.amount), 0);
    const studentPays = (payments || []).filter((p: Record<string, unknown>) => p.student_id === s.id);
    const totalPaid = studentPays.reduce((sum: number, p: Record<string, unknown>) => sum + Number(p.amount), 0);
    return { studentId: s.id, studentName: s.display_name || s.id, totalDue, totalPaid, balance: totalDue - totalPaid };
  });
  return report.filter((r: { totalDue: number; totalPaid: number }) => r.totalDue > 0 || r.totalPaid > 0);
}
