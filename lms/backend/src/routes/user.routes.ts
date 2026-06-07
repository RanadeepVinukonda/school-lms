import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, userQuerySchema } from '../validators/user.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, requireRole('admin'), validate(userQuerySchema, 'query'), asyncHandler(userController.listUsers));
router.put('/profile', authenticate, asyncHandler(userController.updateProfile));
router.post('/', authenticate, requireRole('admin'), validate(createUserSchema), asyncHandler(userController.createUser));
router.get('/:userId', authenticate, requireRole('admin', 'teacher'), asyncHandler(userController.getUser));
router.put('/:userId', authenticate, requireRole('admin'), validate(updateUserSchema), asyncHandler(userController.updateUser));
router.delete('/:userId', authenticate, requireRole('admin'), asyncHandler(userController.deleteUser));
router.patch('/:userId/toggle-active', authenticate, requireRole('admin'), asyncHandler(userController.toggleActive));
router.put('/:userId/role', authenticate, requireRole('admin'), asyncHandler(userController.assignRole));

export default router;
