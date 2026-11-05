import { BaseService, DbRecord } from '../lib/base-service';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

// ── Route Service ───────────────────────────────────────

interface TransportRouteRecord extends DbRecord {
  name: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
}

class TransportRouteService extends BaseService<TransportRouteRecord> {
  protected readonly table = 'transport_routes';
  protected softDelete = true;
}

const routeService = new TransportRouteService();

export async function createRoute(schoolId: string, data: { name: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  return routeService.create({ school_id: schoolId, ...data } as any);
}

export async function getRoutes(schoolId: string) {
  const result = await routeService.list({ schoolId, limit: 100 });
  return result.items;
}

export async function getRouteById(id: string) {
  return routeService.findById(id);
}

export async function updateRoute(id: string, data: { name?: string; vehicle_number?: string; driver_name?: string; driver_phone?: string }) {
  return routeService.update(id, data as any);
}

export async function deleteRoute(id: string) {
  return routeService.delete(id);
}

// ── Stop Service ────────────────────────────────────────

interface TransportStopRecord extends DbRecord {
  route_id: string;
  name: string;
  pickup_time?: string;
  drop_time?: string;
  fare?: number;
  sequence?: number;
}

class TransportStopService extends BaseService<TransportStopRecord> {
  protected readonly table = 'transport_stops';
  protected softDelete = true;
}

const stopService = new TransportStopService();

export async function createStop(schoolId: string, data: { route_id: string; name: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  return stopService.create({ school_id: schoolId, ...data } as any);
}

export async function getStops(routeId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('transport_stops').select('*').eq('route_id', routeId).order('sequence', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateStop(id: string, data: { name?: string; pickup_time?: string; drop_time?: string; fare?: number; sequence?: number }) {
  return stopService.update(id, data as any);
}

export async function deleteStop(id: string) {
  return stopService.delete(id);
}

// ── Assignments (non-standard CRUD, kept as-is + enhanced) ─

export async function assignStudent(schoolId: string, data: { student_id: string; route_id: string; stop_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: existing, error } = await supabase.from('transport_assignments').select('id, route_id').eq('student_id', data.student_id).maybeSingle();
  if (error) throw error;
  const oldRouteId = existing?.route_id;

  if (existing) {
    const { data: result, error: updErr } = await supabase.from('transport_assignments').update(data).eq('student_id', data.student_id).select().single();
    if (updErr) throw new Error(`Failed to assign student: ${updErr.message}`);
    if (oldRouteId && oldRouteId !== data.route_id) {
      logger.info('Student re-routed', { studentId: data.student_id, fromRoute: oldRouteId, toRoute: data.route_id });
    }
    return result;
  } else {
    const { data: result, error: insErr } = await supabase.from('transport_assignments').insert({ school_id: schoolId, ...data }).select().single();
    if (insErr) throw new Error(`Failed to assign student: ${insErr.message}`);
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
  const { error } = await supabase.from('transport_assignments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
}

// ── Attendance (kept as-is — complex queries with joins) ─

export async function markAttendance(schoolId: string, markedBy: string, data: { student_id: string; route_id: string; status: 'boarded' | 'alighted' | 'absent'; direction: 'morning' | 'evening' }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('transport_attendance').insert({
    school_id: schoolId,
    marked_by: markedBy,
    ...data,
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
