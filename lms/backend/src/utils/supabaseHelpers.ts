import { getSupabaseAdmin } from '../services/supabase';

/**
 * Fetch a single row from a Supabase table by filter conditions.
 * Returns null if not found.
 *
 * @param table - The table name to query
 * @param filters - Key-value pairs used as equality filters
 * @returns The matching row or null
 */
export async function fetchOne<T>(table: string, filters: Record<string, unknown>): Promise<T | null> {
  const supabase = getSupabaseAdmin()!;
  let query = supabase.from(table).select('*') as any;
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as T | null;
}

/**
 * Fetch multiple rows from a Supabase table by filter conditions.
 *
 * @param table - The table name to query
 * @param filters - Key-value pairs used as equality filters
 * @returns Array of matching rows
 */
export async function fetchMany<T>(table: string, filters: Record<string, unknown>): Promise<T[]> {
  const supabase = getSupabaseAdmin()!;
  let query = supabase.from(table).select('*') as any;
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}

/**
 * Upsert a single row, returning the resulting row.
 *
 * @param table - The table name
 * @param row - Row data to upsert
 * @param conflictColumn - Column(s) used for conflict resolution (default: 'id')
 * @returns The upserted row
 */
export async function upsertOne<T>(
  table: string,
  row: Record<string, unknown>,
  conflictColumn = 'id',
): Promise<T> {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase
    .from(table)
    .upsert(row, { onConflict: conflictColumn })
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

/**
 * Delete rows matching filter conditions.
 *
 * @param table - The table name
 * @param filters - Key-value pairs used as equality filters
 */
export async function deleteWhere(table: string, filters: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseAdmin()!;
  let query = supabase.from(table).delete() as any;
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { error } = await query;
  if (error) throw error;
}
