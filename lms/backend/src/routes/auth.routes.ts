import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authRateLimit } from '../middlewares/rateLimit.middleware';
import { sendOtpSchema, verifyOtpSchema, updateProfileSchema } from '../validators/auth.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required'),
}).or(z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
}));

router.use(authRateLimit);

router.post('/send-otp', authRateLimit, validate(sendOtpSchema), asyncHandler(authController.sendOtp));
router.post('/verify-otp', authRateLimit, validate(verifyOtpSchema), asyncHandler(authController.verifyOtpLogin));

router.get('/profile', authenticate, asyncHandler(authController.getProfile));
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.post('/verify-token', authenticate, asyncHandler(authController.verifyToken));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh));
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/session', asyncHandler(authController.getSession));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
