import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function requestLeave(schoolId: string, data: { staff_id: string; start_date: string; end_date: string; reason?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  // ponytail: leave balance check — count approved days in the same month
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  const requestedDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1).toISOString();
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { count } = await supabase.from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('staff_id', data.staff_id)
    .eq('status', 'approved')
    .gte('start_date', monthStart)
    .lte('end_date', monthEnd);
  // ponytail: hard-coded 20 days/month — make configurable per school
  const balance = 20 - (count || 0);
  if (requestedDays > balance) {
    logger.warn('Insufficient leave balance', { staff_id: data.staff_id, requestedDays, balance });
    return null;
  }
  const { data: result } = await supabase.from('leave_requests').insert({ school_id: schoolId, ...data, status: 'pending' }).select().single();
  return result;
}

export async function getLeaveRequests(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase
    .from('leave_requests')
    .select('*, staff:staff_records(*)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateLeaveStatus(id: string, status: 'approved' | 'rejected', approvedBy: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase
    .from('leave_requests')
    .update({ status, approved_by: approvedBy })
    .eq('id', id)
    .select().single();
  return result;
}
