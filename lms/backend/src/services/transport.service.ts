import { getSupabaseAdmin } from './supabase';

// ROUTES
export async function createRoute(schoolId: string, data: { name: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('transport_routes').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getRoutes(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('transport_routes').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
  return data || [];
}

export async function getRouteById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('transport_routes').select('*').eq('id', id).single();
  return data;
}

export async function updateRoute(id: string, data: { name?: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('transport_routes').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteRoute(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('transport_routes').delete().eq('id', id);
}

// STOPS
export async function createStop(schoolId: string, data: { route_id: string; name: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('transport_stops').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getStops(routeId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('transport_stops').select('*').eq('route_id', routeId).order('sequence', { ascending: true });
  return data || [];
}

export async function updateStop(id: string, data: { name?: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('transport_stops').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteStop(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('transport_stops').delete().eq('id', id);
}

// ASSIGNMENTS
export async function assignStudent(schoolId: string, data: { student_id: string; route_id: string; stop_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: existing } = await supabase.from('transport_assignments').select('id').eq('student_id', data.student_id).single();
  
  if (existing) {
    const { data: result } = await supabase.from('transport_assignments').update(data).eq('student_id', data.student_id).select().single();
    return result;
  } else {
    const { data: result } = await supabase.from('transport_assignments').insert({ school_id: schoolId, ...data }).select().single();
    return result;
  }
}

export async function getStudentAssignment(studentId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('transport_assignments').select('*, route:transport_routes(*), stop:transport_stops(*)').eq('student_id', studentId).single();
  return data;
}

export async function deleteAssignment(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('transport_assignments').delete().eq('id', id);
}

// ATTENDANCE
export async function markAttendance(schoolId: string, markedBy: string, data: { student_id: string; route_id: string; status: 'boarded' | 'alighted' | 'absent'; direction: 'morning' | 'evening' }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('transport_attendance').insert({
    school_id: schoolId,
    marked_by: markedBy,
    ...data
  }).select().single();
  return result;
}

export async function getAttendance(schoolId: string, routeId: string, date: string, direction: 'morning' | 'evening') {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;
  
  const { data } = await supabase
    .from('transport_attendance')
    .select('*, student:users(id, display_name)')
    .eq('school_id', schoolId)
    .eq('route_id', routeId)
    .eq('direction', direction)
    .gte('marked_at', startOfDay)
    .lte('marked_at', endOfDay)
    .order('marked_at', { ascending: false });
  return data || [];
}
