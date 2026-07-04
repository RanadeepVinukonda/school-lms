import { getSupabaseAdmin } from './supabase';

// SUPPLIERS
export async function createSupplier(schoolId: string, data: { name: string; contact_person?: string; phone?: string; email?: string; address?: string; catalog_items?: string[] }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('suppliers').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getSuppliers(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('suppliers').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  return data || [];
}

export async function updateSupplier(id: string, data: { name?: string; contact_person?: string; phone?: string; email?: string; address?: string; catalog_items?: string[] }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('suppliers').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteSupplier(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('suppliers').delete().eq('id', id);
}

// CATEGORIES
export async function createCategory(schoolId: string, data: { name: string; description?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('inventory_categories').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getCategories(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase.from('inventory_categories').select('*').eq('school_id', schoolId).order('name', { ascending: true });
  return data || [];
}

export async function updateCategory(id: string, data: { name?: string; description?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('inventory_categories').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteCategory(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('inventory_categories').delete().eq('id', id);
}

// ITEMS
export async function createItem(schoolId: string, data: { name: string; category_id?: string; quantity: number; unit?: string; reorder_level?: number; supplier_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('inventory_items').insert({ school_id: schoolId, ...data }).select().single();
  return result;
}

export async function getItems(schoolId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data } = await supabase
    .from('inventory_items')
    .select('*, category:inventory_categories(*), supplier:suppliers(*)')
    .eq('school_id', schoolId)
    .order('name', { ascending: true });
  return data || [];
}

export async function getItemById(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data } = await supabase.from('inventory_items').select('*, category:inventory_categories(*), supplier:suppliers(*)').eq('id', id).single();
  return data;
}

export async function updateItem(id: string, data: { name?: string; category_id?: string; quantity?: number; unit?: string; reorder_level?: number; supplier_id?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data: result } = await supabase.from('inventory_items').update(data).eq('id', id).select().single();
  return result;
}

export async function deleteItem(id: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return;
  await supabase.from('inventory_items').delete().eq('id', id);
}

// USAGE LOGS
export async function logUsage(schoolId: string, actionBy: string, data: { item_id: string; quantity_changed: number; reason?: string }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  
  // 1. Fetch item to adjust quantity
  const { data: item } = await supabase.from('inventory_items').select('quantity').eq('id', data.item_id).single();
  const currentQty = item?.quantity || 0;
  const newQty = currentQty + data.quantity_changed;
  if (newQty < 0) return null; // ponytail: reject negative quantity
  
  // 2. Update item quantity
  await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', data.item_id);
  
  // 3. Log the action
  const { data: result } = await supabase.from('inventory_usage_log').insert({
    school_id: schoolId,
    action_by: actionBy,
    ...data
  }).select().single();
  
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
  
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
}
