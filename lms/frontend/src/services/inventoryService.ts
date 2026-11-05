import api from './api';
import type { ApiResponse } from '@/types';

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  catalog_items?: string[];
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category_id?: string;
  quantity: number;
  unit?: string;
  reorder_level?: number;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
  supplier?: Supplier;
}

export interface InventoryUsageLog {
  id: string;
  item_id: string;
  quantity_changed: number;
  reason?: string;
  action_by: string;
  created_at: string;
  item?: InventoryItem;
  user?: { id: string; display_name: string };
}

export const inventoryService = {
  // SUPPLIERS
  async getSuppliers() {
    const response = await api.get<ApiResponse<Supplier[]>>('/inventory/suppliers');
    return response.data;
  },
  async createSupplier(data: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
    const response = await api.post<ApiResponse<Supplier>>('/inventory/suppliers', data);
    return response.data;
  },
  async updateSupplier(id: string, data: Partial<Supplier>) {
    const response = await api.put<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`, data);
    return response.data;
  },
  async deleteSupplier(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/inventory/suppliers/${id}`);
    return response.data;
  },

  // CATEGORIES
  async getCategories() {
    const response = await api.get<ApiResponse<InventoryCategory[]>>('/inventory/categories');
    return response.data;
  },
  async createCategory(data: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at'>) {
    const response = await api.post<ApiResponse<InventoryCategory>>('/inventory/categories', data);
    return response.data;
  },
  async updateCategory(id: string, data: Partial<InventoryCategory>) {
    const response = await api.put<ApiResponse<InventoryCategory>>(`/inventory/categories/${id}`, data);
    return response.data;
  },
  async deleteCategory(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/inventory/categories/${id}`);
    return response.data;
  },

  // ITEMS
  async getItems() {
    const response = await api.get<ApiResponse<InventoryItem[]>>('/inventory/items');
    return response.data;
  },
  async getItem(id: string) {
    const response = await api.get<ApiResponse<InventoryItem>>(`/inventory/items/${id}`);
    return response.data;
  },
  async createItem(data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) {
    const response = await api.post<ApiResponse<InventoryItem>>('/inventory/items', data);
    return response.data;
  },
  async updateItem(id: string, data: Partial<InventoryItem>) {
    const response = await api.put<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, data);
    return response.data;
  },
  async deleteItem(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/inventory/items/${id}`);
    return response.data;
  },

  // USAGE LOGS
  async logUsage(data: { item_id: string; quantity_changed: number; reason?: string }) {
    const response = await api.post<ApiResponse<InventoryUsageLog>>('/inventory/usage', data);
    return response.data;
  },
  async getUsageLogs(itemId?: string) {
    const response = await api.get<ApiResponse<InventoryUsageLog[]>>('/inventory/usage', { params: { itemId } });
    return response.data;
  },
};
