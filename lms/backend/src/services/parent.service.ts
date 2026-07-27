import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';

export async function getParentChildrenIds(parentId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin()!;
  const { data: parentDoc } = await supabase.from('users').select('children_ids').eq('id', parentId).maybeSingle();
  if (!parentDoc) throw new NotFoundError('Parent not found');
  return (parentDoc.children_ids as string[]) ?? [];
}

export async function getChildDetails(childIds: string[]) {
  const supabase = getSupabaseAdmin()!;
  const { data: childRows } = await supabase.from('users').select('*').in('id', childIds);
  const children = await Promise.all(
    (childRows || []).map(async (row) => {
      let classInfo: { name?: string; grade?: number; section?: string } | null = null;
      if (row.class_id) {
        const { data: cls } = await supabase.from('classes').select('name, grade, section').eq('id', row.class_id).maybeSingle();
        if (cls) classInfo = cls;
      }
      const { password, ...rest } = row;
      return { id: row.id, ...rest, classInfo };
    }),
  );
  return children;
}

export async function getChildProfile(studentId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: studentRow } = await supabase.from('users').select('*').eq('id', studentId).maybeSingle();
  if (!studentRow) throw new NotFoundError('Student not found');
  const { password: _sp, ...student } = studentRow;
  return student;
}

export async function getChildClassName(classId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin()!;
  const { data: cls } = await supabase.from('classes').select('name').eq('id', classId).maybeSingle();
  return cls?.name ?? null;
}

export async function getChildDisplayName(studentId: string): Promise<string> {
  const supabase = getSupabaseAdmin()!;
  const { data: studentRow } = await supabase.from('users').select('display_name').eq('id', studentId).maybeSingle();
  return studentRow?.display_name || 'Student';
}

export async function verifyChildOwnership(parentId: string, studentId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()!;
  const { data: parentDoc } = await supabase.from('users').select('children_ids').eq('id', parentId).maybeSingle();
  const childrenIds: string[] = (parentDoc?.children_ids as string[]) ?? [];
  return childrenIds.includes(studentId);
}

export async function getChildDisplayNames(childIds: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin()!;
  const nameMap = new Map<string, string>();
  for (const childId of childIds) {
    const { data: studentRow } = await supabase.from('users').select('display_name').eq('id', childId).maybeSingle();
    if (studentRow) nameMap.set(childId, studentRow.display_name || 'Student');
  }
  return nameMap;
}
