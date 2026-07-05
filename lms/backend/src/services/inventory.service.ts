import { getSupabaseAdmin } from './supabase';

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
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
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
  const { error } = await supabase.from('inventory_categories').delete().eq('id', id);
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

export async function updateItem(id: string, data: { name?: string; category_id?: string; quantity?: number; unit?: string; reorder_level?: number; supplier_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result, error } = await supabase.from('inventory_items').update(data).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update item: ${error.message}`);
  return result;
}

export async function deleteItem(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}

// USAGE LOGS
export async function logUsage(schoolId: string, actionBy: string, data: { item_id: string; quantity_changed: number; reason?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  
  // 1. Fetch item to adjust quantity
  const { data: item, error: itemErr } = await supabase.from('inventory_items').select('quantity').eq('id', data.item_id).single();
  if (itemErr) throw new Error('Failed to fetch inventory item: ' + itemErr.message);
  const currentQty = item?.quantity || 0;
  const newQty = currentQty + data.quantity_changed;
  if (newQty < 0) return null; // ponytail: reject negative quantity
  
  // 2. Update item quantity
  const { error: updateError } = await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', data.item_id);
  if (updateError) throw new Error(`Failed to update item quantity: ${updateError.message}`);
  
  // 3. Log the action
  const { data: result, error: logError } = await supabase.from('inventory_usage_log').insert({
    school_id: schoolId,
    action_by: actionBy,
    ...data
  }).select().single();
  if (logError) throw new Error(`Failed to log usage: ${logError.message}`);
  return result;
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
