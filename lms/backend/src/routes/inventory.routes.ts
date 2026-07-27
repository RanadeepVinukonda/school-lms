import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as inventoryService from '../services/inventory.service';
import {
  createSupplierSchema,
  updateSupplierSchema,
  createCategorySchema,
  updateCategorySchema,
  createItemSchema,
  updateItemSchema,
  logUsageSchema,
  usageQuerySchema,
} from '../validators/inventory.validator';

const router = Router();

// SUPPLIERS
router.get('/suppliers', authenticate, asyncHandler(async (req, res) => {
  const list = await inventoryService.getSuppliers(req.user!.school_id || '');
  sendSuccess(res, list);
}));

router.post('/suppliers', authenticate, requireRole('admin', 'super_admin'),
  validate(createSupplierSchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createSupplier(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/suppliers/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(updateSupplierSchema),
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
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createCategory(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/categories/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(updateCategorySchema),
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
  validate(createItemSchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.createItem(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.put('/items/:id', authenticate, requireRole('admin', 'super_admin'),
  validate(updateItemSchema),
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
  validate(logUsageSchema),
  asyncHandler(async (req, res) => {
    const result = await inventoryService.logUsage(req.user!.school_id || '', req.user!.uid, req.body);
    sendSuccess(res, result);
  })
);

router.get('/usage', authenticate,
  validate(usageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { itemId } = req.query as any;
    const list = await inventoryService.getUsageLogs(req.user!.school_id || '', itemId);
    sendSuccess(res, list);
  })
);

export default router;
