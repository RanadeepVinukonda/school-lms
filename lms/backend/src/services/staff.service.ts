import { getSupabaseAdmin } from './supabase';

export async function createStaff(schoolId: string, data: { name: string; role: 'teacher' | 'non-teaching'; department?: string; joining_date?: string; contract_url?: string; user_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('staff_records').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getStaff(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('staff_records').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  return data || [];
}

export async function getStaffById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('staff_records').select('*').eq('id', id).single();
  return data;
}

export async function updateStaff(id: string, data: { name?: string; role?: 'teacher' | 'non-teaching'; department?: string; joining_date?: string; contract_url?: string; user_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('staff_records').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteStaff(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('staff_records').delete().eq('id', id);
}

// Attendance
export async function markStaffAttendance(schoolId: string, staffId: string, date: string, status: 'present' | 'absent' | 'leave') {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: existing } = await supabase.from('staff_attendance').select('id').eq('staff_id', staffId).eq('date', date).single();
  
  if (existing) {
    const { data: result } = await supabase.from('staff_attendance').update({ status }).eq('id', existing.id).select().single();
    return result;
  } else {
    const { data: result } = await supabase.from('staff_attendance').insert({ school_id: schoolId, staff_id: staffId, date, status }).select().single();
    return result;
  }
}

export async function getStaffAttendanceReport(schoolId: string, dateStart: string, dateEnd: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase
    .from('staff_attendance')
    .select('*, staff:staff_records(*)')
    .eq('school_id', schoolId)
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .order('date', { ascending: true });
  return data || [];
}
