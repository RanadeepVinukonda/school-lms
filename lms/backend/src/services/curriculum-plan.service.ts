import { getSupabaseAdmin } from './supabase';

interface ChapterPlan {
  chapterId: string;
  chapterTitle: string;
  week: number;
  startDate: string;
  endDate: string;
}

interface CurriculumPlan {
  id?: string;
  teacher_id: string;
  board_id: string;
  grade: string;
  subject: string;
  title: string;
  academic_year: string;
  school_id: string;
  chapters: ChapterPlan[];
}

export async function createPlan(plan: CurriculumPlan) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.from('curriculum_plans').insert(plan).select().single();
  if (error) throw new Error(`Failed to create plan: ${error.message}`);
  return data;
}

export async function getPlans(teacherId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  let q = supabase.from('curriculum_plans').select('*').eq('teacher_id', teacherId);
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data } = await q.order('created_at', { ascending: false });
  return data || [];
}

export async function getPlan(id: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  let q = supabase.from('curriculum_plans').select('*').eq('id', id);
  if (schoolId) q = q.eq('school_id', schoolId);
  const { data } = await q.maybeSingle();
  return data;
}

export async function updatePlan(id: string, updates: Partial<CurriculumPlan>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.from('curriculum_plans').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update plan: ${error.message}`);
  return data;
}

export async function deletePlan(id: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from('curriculum_plans').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete plan: ${error.message}`);
}
