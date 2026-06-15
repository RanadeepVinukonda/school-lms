import { Router } from 'express';
import * as virtualLabsController from '../controllers/virtual-labs.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(virtualLabsController.getAllLabs));
router.get('/:id', authenticate, asyncHandler(virtualLabsController.getLabById));
router.post('/', authenticate, requireRole('teacher', 'admin'), asyncHandler(virtualLabsController.createLab));
router.put('/:id', authenticate, requireRole('teacher', 'admin'), asyncHandler(virtualLabsController.updateLab));
router.delete('/:id', authenticate, requireRole('teacher', 'admin'), asyncHandler(virtualLabsController.deleteLab));
router.post('/:id/complete', authenticate, asyncHandler(virtualLabsController.markLabCompleted));
router.get('/progress/:studentId', authenticate, asyncHandler(virtualLabsController.getStudentProgress));

export default router;
