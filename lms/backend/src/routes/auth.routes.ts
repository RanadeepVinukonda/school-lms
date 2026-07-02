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
router.post('/reset-with-token', authRateLimit, asyncHandler(authController.resetWithToken));
router.get('/verify-hash', asyncHandler(authController.verifyHash));
router.post('/change-password', authRateLimit, authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.get('/profile', authenticate, asyncHandler(authController.getProfile));
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.post('/verify-token', authenticate, asyncHandler(authController.verifyToken));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
