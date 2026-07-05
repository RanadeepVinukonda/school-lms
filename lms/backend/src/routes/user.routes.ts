import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, userQuerySchema } from '../validators/user.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  photoURL: z.string().url().optional(),
}).passthrough();

const pingActiveSchema = z.object({}).passthrough();

const toggleActiveSchema = z.object({
  disabled: z.boolean().optional(),
}).passthrough();

const assignRoleSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin', 'parent']),
  classIds: z.array(z.string()).optional(),
}).passthrough();

router.get('/', authenticate, requireRole('admin', 'super_admin'), validate(userQuerySchema, 'query'), asyncHandler(userController.listUsers));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(userController.updateProfile));
router.post('/ping-active', authenticate, validate(pingActiveSchema), asyncHandler(userController.pingActive));
router.get('/strengths-weaknesses', authenticate, asyncHandler(userController.getStrengthsWeaknesses));
router.get('/strengths-weaknesses/:userId', authenticate, requireRole('admin', 'super_admin', 'teacher'), asyncHandler(userController.getStrengthsWeaknesses));
router.post('/', authenticate, requireRole('admin', 'super_admin'), validate(createUserSchema), asyncHandler(userController.createUser));
router.get('/:userId', authenticate, requireRole('admin', 'super_admin', 'teacher'), asyncHandler(userController.getUser));
router.put('/:userId', authenticate, requireRole('admin', 'super_admin'), validate(updateUserSchema), asyncHandler(userController.updateUser));
router.delete('/:userId', authenticate, requireRole('admin', 'super_admin'), asyncHandler(userController.deleteUser));
router.patch('/:userId/toggle-active', authenticate, requireRole('admin', 'super_admin'), validate(toggleActiveSchema), asyncHandler(userController.toggleActive));
router.put('/:userId/role', authenticate, requireRole('admin', 'super_admin'), validate(assignRoleSchema), asyncHandler(userController.assignRole));

export default router;
