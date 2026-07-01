import { getSupabaseAdmin } from './supabase';

export async function createTimetableEntry(data: {
  classId: string; day: string; period: number; subjectId?: string; teacherId?: string; room?: string;
  startTime?: string; endTime?: string; schoolId: string;
}) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('timetable').insert({
    class_id: data.classId, day: data.day, period: data.period, subject_id: data.subjectId,
    teacher_id: data.teacherId, room: data.room, start_time: data.startTime, end_time: data.endTime,
    school_id: data.schoolId,
  }).select().single();
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
  if (data.subjectId) snake.subject_id = data.subjectId;
  if (data.teacherId) snake.teacher_id = data.teacherId;
  if (data.room) snake.room = data.room;
  if (data.startTime) snake.start_time = data.startTime;
  if (data.endTime) snake.end_time = data.endTime;
  if (data.classId) snake.class_id = data.classId;
  if (data.status) snake.status = data.status;
  const { data: result } = await supabase.from('timetable').update(snake).eq('id', id).select().single();
  return result;
}

export async function deleteTimetableEntry(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('timetable').delete().eq('id', id);
}
