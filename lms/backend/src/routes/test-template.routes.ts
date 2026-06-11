import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as testTemplateController from '../controllers/test-template.controller';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(testTemplateController.createTemplate));
router.get('/', authenticate, asyncHandler(testTemplateController.listTemplates));
router.get('/:id', authenticate, asyncHandler(testTemplateController.getTemplate));
router.put('/:id', authenticate, requireRole('teacher'), asyncHandler(testTemplateController.updateTemplate));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(testTemplateController.deleteTemplate));

export default router;
