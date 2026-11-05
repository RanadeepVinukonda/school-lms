import { getSupabaseClient } from './supabase';

export async function getStudentEnrollments(studentId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('enrollments').select('*').eq('student_id', studentId).eq('status', 'active');
  return (data || []).map((row: Record<string, unknown>) => ({ id: row.id, ...row }));
}

export async function getStudentClassId(studentId: string): Promise<string | undefined> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('users').select('class_id').eq('id', studentId).maybeSingle();
  return data?.class_id as string | undefined;
}

export async function getClassTextbooks(classId: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('textbooks').select('*').eq('class_id', classId);
  return (data || []).map((row: Record<string, unknown>) => ({ id: row.id, ...row }));
}

export async function getConceptReleases(textbookIds: string[]) {
  const supabase = getSupabaseClient();
  if (textbookIds.length === 0) return [];
  const { data } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'conceptReleases').in('data->>textbookId', textbookIds);
  return (data || []).map((row: Record<string, unknown>) => ({ id: row.doc_id, ...(row.data as object) }));
}
