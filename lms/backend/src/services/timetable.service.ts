import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return new Pool({ connectionString: url, max: 1 });
}

export async function createTimetableEntry(data: {
  classId: string; day: string; period: number; subjectId?: string; teacherId?: string; room?: string;
  startTime?: string; endTime?: string; schoolId: string;
}) {
  const supabase = getSupabaseAdmin()!;
  // ponytail: teacher double-booking guard
  if (data.teacherId) {
    const { data: existing, error } = await supabase.from('timetable')
      .select('id').eq('teacher_id', data.teacherId).eq('day', data.day).eq('period', data.period)
      .limit(1);
    if (error) throw error;
    if (existing && existing.length > 0) {
      logger.warn('Teacher already booked for this period', { teacherId: data.teacherId, day: data.day, period: data.period });
      return null;
    }
  }
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
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('timetable').select('*').eq('class_id', classId).order('day').order('period');
  if (error) throw error;
  return data || [];
}

export async function getTimetableBySchool(schoolId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('timetable').select('*').eq('school_id', schoolId).order('day').order('period');
  if (error) throw error;
  return data || [];
}

export async function updateTimetableEntry(id: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const snake: Record<string, unknown> = {};
  if (data.day) snake.day = data.day;
  if (data.period !== undefined) snake.period = data.period;
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
  const supabase = getSupabaseAdmin()!;
  const { error } = await supabase.from('timetable').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    logger.error('Failed to delete timetable entry', { error: error.message, id });
  }
}

export async function saveTimetableDay(data: {
  classId: string; day: string; schoolId: string;
  periods: Array<{ period: number; subjectId?: string; teacherId?: string; room?: string; startTime?: string; endTime?: string }>;
}) {
  const supabase = getSupabaseAdmin()!;
  const toNull = (v: string | undefined | null) => (v && v.trim() ? v : null);
  if (!data.schoolId) {
    const { data: schools, error: schoolErr } = await supabase.from('schools').select('id').limit(1);
    if (schoolErr) throw schoolErr;
    data.schoolId = (schools?.[0] as any)?.id || data.schoolId;
  }
  if (!data.schoolId) throw new Error('No school ID available');

  const rows = data.periods.filter(p => p.subjectId || p.teacherId || p.room || p.startTime || p.endTime).map(p => ({
    class_id: data.classId, day: data.day, period: p.period,
    subject_id: toNull(p.subjectId), teacher_id: toNull(p.teacherId),
    room: p.room && p.room.trim() ? p.room : '',
    start_time: toNull(p.startTime), end_time: toNull(p.endTime),
    school_id: data.schoolId,
  }));

  // ponytail: atomic transaction — delete then insert within a single pg transaction
  const pool = getPool();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM timetable WHERE class_id = $1 AND day = $2', [data.classId, data.day]);
      if (rows.length > 0) {
        for (const row of rows) {
          await client.query(
            'INSERT INTO timetable (class_id, day, period, subject_id, teacher_id, room, start_time, end_time, school_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [row.class_id, row.day, row.period, row.subject_id, row.teacher_id, row.room, row.start_time, row.end_time, row.school_id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to save timetable day', { error: err instanceof Error ? err.message : String(err), classId: data.classId, day: data.day });
      throw new Error('Failed to save timetable day');
    } finally {
      client.release();
    }
    return rows;
  }

  // ponytail: fallback when no pg pool — sequential ops
  const { error: delErr } = await supabase.from('timetable').update({ deleted_at: new Date().toISOString() }).eq('class_id', data.classId).eq('day', data.day);
  if (delErr) {
    logger.error('Failed to clear timetable day', { error: delErr.message, classId: data.classId, day: data.day });
    throw new Error('Failed to clear existing entries');
  }
  if (rows.length === 0) return [];
  const { data: result, error } = await supabase.from('timetable').insert(rows).select();
  if (error) {
    logger.error('Failed to save timetable day', { error: error.message, classId: data.classId, day: data.day });
    throw new Error(error.message);
  }
  return result;
}

export async function getTimetableByClassAndDay(classId: string, day: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('timetable').select('*').eq('class_id', classId).eq('day', day).order('period');
  if (error) throw error;
  return data || [];
}
