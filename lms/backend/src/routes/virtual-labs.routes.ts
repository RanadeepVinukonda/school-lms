import { Router } from 'express';
import { z } from 'zod';
import * as virtualLabsController from '../controllers/virtual-labs.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createLabSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  type: z.enum(['physics', 'chemistry', 'biology']),
  description: z.string().optional(),
}).passthrough();

const updateLabSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
}).passthrough();

const markCompletedSchema = z.object({}).passthrough();

router.get('/', authenticate, asyncHandler(virtualLabsController.getAllLabs));
router.get('/:id', authenticate, asyncHandler(virtualLabsController.getLabById));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createLabSchema), asyncHandler(virtualLabsController.createLab));
router.put('/:id', authenticate, requireRole('teacher', 'admin'), validate(updateLabSchema), asyncHandler(virtualLabsController.updateLab));
router.delete('/:id', authenticate, requireRole('teacher', 'admin'), asyncHandler(virtualLabsController.deleteLab));
router.post('/:id/complete', authenticate, validate(markCompletedSchema), asyncHandler(virtualLabsController.markLabCompleted));
router.get('/progress/:studentId', authenticate, asyncHandler(virtualLabsController.getStudentProgress));

export default router;
