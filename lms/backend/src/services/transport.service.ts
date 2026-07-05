import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

// ROUTES
export async function createRoute(schoolId: string, data: { name: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_routes').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create route: ${error.message}`);
  return result;
}

export async function getRoutes(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('transport_routes').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRouteById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('transport_routes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateRoute(id: string, data: { name?: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_routes').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update route: ${error.message}`);
  return result;
}

export async function deleteRoute(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('transport_routes').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete route: ${error.message}`);
}

// STOPS
export async function createStop(schoolId: string, data: { route_id: string; name: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_stops').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create stop: ${error.message}`);
  return result;
}

export async function getStops(routeId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('transport_stops').select('*').eq('route_id', routeId).order('sequence', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateStop(id: string, data: { name?: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_stops').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update stop: ${error.message}`);
  return result;
}

export async function deleteStop(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('transport_stops').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete stop: ${error.message}`);
}

// ASSIGNMENTS
export async function assignStudent(schoolId: string, data: { student_id: string; route_id: string; stop_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: existing, error } = await supabase.from('transport_assignments').select('id, route_id').eq('student_id', data.student_id).maybeSingle();
  if (error) throw error;
  const oldRouteId = existing?.route_id;
  
  if (existing) {
    const { data: result, error } = await supabase.from('transport_assignments').update(data).eq('student_id', data.student_id).select().single();
    if (error) throw new Error(`Failed to assign student: ${error.message}`);
    // ponytail: log old route change — upgrade to push notification when notification service supports transport events
    if (oldRouteId && oldRouteId !== data.route_id) {
      logger.info('Student re-routed', { studentId: data.student_id, fromRoute: oldRouteId, toRoute: data.route_id });
    }
    return result;
  } else {
    const { data: result, error } = await supabase.from('transport_assignments').insert({ school_id: schoolId, ...data }).select().single();
    if (error) throw new Error(`Failed to assign student: ${error.message}`);
    return result;
  }
}

export async function getStudentAssignment(studentId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('transport_assignments').select('*, route:transport_routes(*), stop:transport_stops(*)').eq('student_id', studentId).single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('transport_assignments').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
}

// ATTENDANCE
export async function markAttendance(schoolId: string, markedBy: string, data: { student_id: string; route_id: string; status: 'boarded' | 'alighted' | 'absent'; direction: 'morning' | 'evening' }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_attendance').insert({
    school_id: schoolId,
    marked_by: markedBy,
    ...data
  }).select().single();
  if (error) throw new Error(`Failed to mark attendance: ${error.message}`);
  return result;
}

export async function getAttendance(schoolId: string, routeId: string, date: string, direction: 'morning' | 'evening') {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;
  
  const { data, error } = await supabase
    .from('transport_attendance')
    .select('*, student:users(id, display_name)')
    .eq('school_id', schoolId)
    .eq('route_id', routeId)
    .eq('direction', direction)
    .gte('marked_at', startOfDay)
    .lte('marked_at', endOfDay)
    .order('marked_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
