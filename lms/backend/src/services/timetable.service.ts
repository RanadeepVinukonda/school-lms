import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function createTimetableEntry(data: {
  classId: string; day: string; period: number; subjectId?: string; teacherId?: string; room?: string;
  startTime?: string; endTime?: string; schoolId: string;
}) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const toNull = (v: string | undefined | null) => (v && v.trim() ? v : null);
  const insertData: Record<string, unknown> = {
    class_id: data.classId, day: data.day, period: data.period,
    subject_id: toNull(data.subjectId), teacher_id: toNull(data.teacherId),
    room: data.room && data.room.trim() ? data.room : '', start_time: toNull(data.startTime),
    end_time: toNull(data.endTime), school_id: data.schoolId,
  };
  const { data: result, error } = await supabase.from('timetable').insert(insertData).select().single();
  if (error) {
    logger.error('Failed to create timetable entry', { error: error.message, data: insertData });
    return null;
  }
  return result;
}

export async function getTimetableByClass(classId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('timetable').select('*').eq('class_id', classId).order('day').order('period');
  return data || [];
}

export async function getTimetableBySchool(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('timetable').select('*').eq('school_id', schoolId).order('day').order('period');
  return data || [];
}

export async function updateTimetableEntry(id: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const snake: Record<string, unknown> = {};
  if (data.day) snake.day = data.day;
  if (data.period) snake.period = data.period;
  if (data.subjectId !== undefined) snake.subject_id = data.subjectId || null;
  if (data.teacherId !== undefined) snake.teacher_id = data.teacherId || null;
  if (data.room !== undefined) snake.room = data.room || '';
  if (data.startTime !== undefined) snake.start_time = data.startTime || null;
  if (data.endTime !== undefined) snake.end_time = data.endTime || null;
  if (data.classId) snake.class_id = data.classId;
  if (data.status) snake.status = data.status;
  const { data: result, error } = await supabase.from('timetable').update(snake).eq('id', id).select().single();
  if (error) {
    logger.error('Failed to update timetable entry', { error: error.message, id, data: snake });
    return null;
  }
  return result;
}

export async function deleteTimetableEntry(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('timetable').delete().eq('id', id);
  if (error) {
    logger.error('Failed to delete timetable entry', { error: error.message, id });
  }
}

export async function saveTimetableDay(data: {
  classId: string; day: string; schoolId: string;
  periods: Array<{ period: number; subjectId?: string; teacherId?: string; room?: string; startTime?: string; endTime?: string }>;
}) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const toNull = (v: string | undefined | null) => (v && v.trim() ? v : null);
  const rows = data.periods.map(p => ({
    class_id: data.classId, day: data.day, period: p.period,
    subject_id: toNull(p.subjectId), teacher_id: toNull(p.teacherId),
    room: p.room && p.room.trim() ? p.room : '',
    start_time: toNull(p.startTime), end_time: toNull(p.endTime),
    school_id: data.schoolId,
  }));
  const { data: result, error } = await supabase
    .from('timetable')
    .upsert(rows, { onConflict: 'class_id,day,period', ignoreDuplicates: false })
    .select();
  if (error) {
    logger.error('Failed to save timetable day', { error: error.message, classId: data.classId, day: data.day });
    return [];
  }
  return result;
}

export async function getTimetableByClassAndDay(classId: string, day: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('timetable').select('*').eq('class_id', classId).eq('day', day).order('period');
  return data || [];
}
