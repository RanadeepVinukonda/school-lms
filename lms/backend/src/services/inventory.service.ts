import { getSupabaseAdmin } from './supabase';
import { getConnectionPool } from '../database/connection-manager';
import { withAdvisoryLock } from '../utils/advisory-lock';

// SUPPLIERS
export async function createSupplier(schoolId: string, data: { name: string; contact_person?: string; phone?: string; email?: string; address?: string; catalog_items?: string[] }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('suppliers').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create supplier: ${error.message}`);
  return result;
}

export async function getSuppliers(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('suppliers').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  if (error) throw new Error('Failed to fetch suppliers: ' + error.message);
  return data || [];
}

export async function updateSupplier(id: string, data: { name?: string; contact_person?: string; phone?: string; email?: string; address?: string; catalog_items?: string[] }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('suppliers').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update supplier: ${error.message}`);
  return result;
}

export async function deleteSupplier(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete supplier: ${error.message}`);
}

// CATEGORIES
export async function createCategory(schoolId: string, data: { name: string; description?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('inventory_categories').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return result;
}

export async function getCategories(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase.from('inventory_categories').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  if (error) throw new Error('Failed to fetch categories: ' + error.message);
  return data || [];
}

export async function updateCategory(id: string, data: { name?: string; description?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('inventory_categories').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update category: ${error.message}`);
  return result;
}

export async function deleteCategory(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('inventory_categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete category: ${error.message}`);
}

// ITEMS
export async function createItem(schoolId: string, data: { name: string; category_id?: string; quantity: number; unit?: string; reorder_level?: number; supplier_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('inventory_items').insert({ school_id: schoolId, ...data }).select().single();
  if (error) throw new Error(`Failed to create item: ${error.message}`);
  return result;
}

export async function getItems(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(*), supplier:suppliers(*)')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });
  if (error) throw new Error('Failed to fetch inventory items: ' + error.message);
  return data || [];
}

export async function getItemById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('inventory_items').select('*, category:inventory_categories(*), supplier:suppliers(*)').eq('id', id).single();
  if (error) throw new Error('Failed to fetch inventory item: ' + error.message);
  return data;
}

export async function updateItem(id: string, data: { name?: string; category_id?: string; quantity?: number; unit?: string; reorder_level?: number; supplier_id?: string; version?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const version = data.version;
  if (version === undefined) throw new Error('Version is required for concurrent updates');

  const { data: current } = await supabase.from('inventory_items').select('version').eq('id', id).maybeSingle();
  if (!current) throw new Error('Inventory item not found');
  if (current.version !== version) throw new Error('Concurrent modification detected. Please retry.');

  const { data: result, error } = await supabase
    .from('inventory_items')
    .update({ ...data, version: version + 1 })
    .eq('id', id)
    .eq('version', version)
    .select()
    .single();
  if (error) throw new Error(`Failed to update item: ${error.message}`);
  if (!result) throw new Error('Concurrent modification detected. Please retry.');
  return result;
}

export async function deleteItem(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('inventory_items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}

// USAGE LOGS
export async function logUsage(schoolId: string, actionBy: string, data: { item_id: string; quantity_changed: number; reason?: string }) {
  const pool = getConnectionPool();
  const client = await pool.connect();
  return withAdvisoryLock(`inventory:${data.item_id}`, async () => {
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(
        `WITH current_item AS (
           SELECT version, quantity FROM inventory_items WHERE id = $1 AND deleted_at IS NULL
         )
         UPDATE inventory_items
         SET quantity = current_item.quantity - $2, version = current_item.version + 1
         FROM current_item
         WHERE inventory_items.id = $1
           AND inventory_items.version = current_item.version
           AND current_item.quantity >= $2`,
        [data.item_id, data.quantity_changed]
      );
      if ((updateResult as unknown as { rowCount: number | null }).rowCount === 0) {
        await client.query('ROLLBACK');
        throw new Error('Item not found, concurrent modification, or insufficient stock.');
      }

      const { rows } = await client.query(
        `INSERT INTO inventory_usage_log (school_id, action_by, item_id, quantity_changed, reason)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [schoolId, actionBy, data.item_id, data.quantity_changed, data.reason || null]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  }, client);
}

export async function getUsageLogs(schoolId: string, itemId?: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  let query = supabase
    .from('inventory_usage_log')
    .select('*, item:inventory_items(*), user:users(id, display_name)')
    .eq('school_id', schoolId);
  
  if (itemId) {
    query = query.eq('item_id', itemId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch usage logs: ' + error.message);
  return data || [];
}
