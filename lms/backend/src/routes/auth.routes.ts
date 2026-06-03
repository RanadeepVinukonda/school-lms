import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authRateLimit } from '../middlewares/rateLimit.middleware';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/register', authRateLimit, validate(signUpSchema), asyncHandler(authController.register));
router.post('/login', authRateLimit, validate(signInSchema), asyncHandler(authController.login));
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.get('/profile', authenticate, asyncHandler(authController.getProfile));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
