import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authRateLimit } from '../middlewares/rateLimit.middleware';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const resetWithTokenSchema = z.object({
  token: z.string().min(1, 'Token required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

router.use(authRateLimit);

router.post('/register', validate(signUpSchema), asyncHandler(authController.register));
router.post('/login', validate(signInSchema), asyncHandler(authController.login));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post('/reset-with-token', validate(resetWithTokenSchema), asyncHandler(authController.resetWithToken));
router.get('/verify-hash', asyncHandler(authController.verifyHash));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.get('/profile', authenticate, asyncHandler(authController.getProfile));
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.post('/verify-token', authenticate, asyncHandler(authController.verifyToken));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/session', asyncHandler(authController.getSession));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
