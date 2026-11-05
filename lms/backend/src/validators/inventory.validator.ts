import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')),
  address: z.string().optional(),
  catalog_items: z.array(z.string()).optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  address: z.string().optional(),
  catalog_items: z.array(z.string()).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category_id: z.string().uuid().optional(),
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
  unit: z.string().optional(),
  reorder_level: z.number().int().optional(),
  supplier_id: z.string().uuid().optional(),
});

export const updateItemSchema = z.object({
  name: z.string().optional(),
  category_id: z.string().uuid().optional(),
  quantity: z.number().int().optional(),
  unit: z.string().optional(),
  reorder_level: z.number().int().optional(),
  supplier_id: z.string().uuid().optional(),
});

export const logUsageSchema = z.object({
  item_id: z.string().uuid(),
  quantity_changed: z.number().int(),
  reason: z.string().optional(),
});

export const usageQuerySchema = z.object({
  itemId: z.string().uuid().optional(),
});
