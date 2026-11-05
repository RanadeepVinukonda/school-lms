import { getSupabaseAdmin } from './supabase';

export async function createStaff(schoolId: string, data: { name: string; role: 'teacher' | 'non-teaching'; department?: string; joining_date?: string; contract_url?: string; user_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('staff_records').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create staff: ${error.message}`);
  return result;
}

export async function getStaff(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('staff_records').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  if (error) throw new Error('Failed to fetch staff: ' + error.message);
  return data || [];
}

export async function getStaffById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('staff_records').select('*').eq('id', id).single();
  if (error) throw new Error('Failed to fetch staff: ' + error.message);
  return data;
}

export async function updateStaff(id: string, data: { name?: string; role?: 'teacher' | 'non-teaching'; department?: string; joining_date?: string; contract_url?: string; user_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('staff_records').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update staff: ${error.message}`);
  return result;
}

export async function deleteStaff(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('staff_records').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete staff: ${error.message}`);
}

// Attendance
export async function markStaffAttendance(schoolId: string, staffId: string, date: string, status: 'present' | 'absent' | 'leave') {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: existing, error: fetchErr } = await supabase.from('staff_attendance').select('id').eq('staff_id', staffId).eq('date', date).single();
  if (fetchErr && fetchErr.code !== 'PGRST116') throw new Error('Failed to fetch attendance: ' + fetchErr.message);
  
  if (existing) {
    const { data: result, error } = await supabase.from('staff_attendance').update({ status }).eq('id', existing.id).select().single();
    if (error) throw new Error(`Failed to mark staff attendance: ${error.message}`);
    return result;
  } else {
    const { data: result, error } = await supabase.from('staff_attendance').insert({ school_id: schoolId, staff_id: staffId, date, status }).select().single();
    if (error) throw new Error(`Failed to mark staff attendance: ${error.message}`);
    return result;
  }
}

export async function getStaffAttendanceReport(schoolId: string, dateStart: string, dateEnd: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff_records(*)')
    .eq('school_id', schoolId)
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .order('date', { ascending: true });
  if (error) throw new Error('Failed to fetch attendance report: ' + error.message);
  return data || [];
}
