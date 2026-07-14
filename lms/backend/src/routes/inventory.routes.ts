import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as inventoryService from '../services/inventory.service';

const router = Router();

// SUPPLIERS
router.get('/suppliers', authenticate, asyncHandler(async (req, res) => {
  const list = await inventoryService.getSuppliers(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.post('/suppliers', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().min(1, 'Supplier name is required'),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').or(z.literal('')),
    address: z.string().optional(),
    catalog_items: z.array(z.string()).optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createSupplier(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/suppliers/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email').or(z.literal('')).optional(),
    address: z.string().optional(),
    catalog_items: z.array(z.string()).optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.updateSupplier(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/suppliers/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await inventoryService.deleteSupplier(req.params.id);
  sendSuccess(res, null, 'Supplier deleted');
}));

// CATEGORIES
router.get('/categories', authenticate, asyncHandler(async (req, res) => {
  const list = await inventoryService.getCategories(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.post('/categories', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createCategory(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/categories/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.updateCategory(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/categories/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await inventoryService.deleteCategory(req.params.id);
  sendSuccess(res, null, 'Category deleted');
}));

// ITEMS
router.get('/items', authenticate, asyncHandler(async (req, res) => {
  const list = await inventoryService.getItems(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.get('/items/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await inventoryService.getItemById(req.params.id);
  sendSuccess(res, item);
}));

router.post('/items', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().min(1, 'Item name is required'),
    category_id: z.string().uuid().optional(),
    quantity: z.number().int().nonnegative('Quantity cannot be negative'),
    unit: z.string().optional(),
    reorder_level: z.number().int().optional(),
    supplier_id: z.string().uuid().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createItem(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/items/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    name: z.string().optional(),
    category_id: z.string().uuid().optional(),
    quantity: z.number().int().optional(),
    unit: z.string().optional(),
    reorder_level: z.number().int().optional(),
    supplier_id: z.string().uuid().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.updateItem(req.params.id, req.body);
    sendSuccess(res, result);
  })
);

router.delete('/items/:id', authenticate, requireRole('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await inventoryService.deleteItem(req.params.id);
  sendSuccess(res, null, 'Item deleted');
}));

// USAGE LOGS
router.post('/usage', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    item_id: z.string().uuid(),
    quantity_changed: z.number().int(),
    reason: z.string().optional(),
  })),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.logUsage(req.user!.school_id || '', req.user!.uid, req.body);
    sendSuccess(res, result);
  })
);

router.get('/usage', authenticate,
  validate(z.object({
    itemId: z.string().uuid().optional(),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { itemId } = req.query as any;
    const list = await inventoryService.getUsageLogs(req.user!.school_id || '', itemId);
    sendSuccess(res, list);
  })
);

export default router;
