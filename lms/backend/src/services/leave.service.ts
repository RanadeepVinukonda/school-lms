import { getSupabaseAdmin } from './supabase';

export async function requestLeave(schoolId: string, data: { staff_id: string; start_date: string; end_date: string; reason?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('leave_requests').insert({ school_id: schoolId, ...data }).select().single();
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
