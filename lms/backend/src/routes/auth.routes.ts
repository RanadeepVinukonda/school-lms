import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { authRateLimit } from '../middlewares/rateLimit.middleware';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required'),
}).or(z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
}));

router.use(authRateLimit);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account with email, password, and display name. Password must contain uppercase, lowercase, number, and special character.
 *     operationId: register
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, displayName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@school.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 example: Password1!
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Jane Doe
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin, parent]
 *                 default: student
 *               phoneNumber:
 *                 type: string
 *                 maxLength: 20
 *               photoURL:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/register', validate(signUpSchema), asyncHandler(authController.register));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in
 *     description: Authenticates user by email and password. Returns JWT tokens and sets session cookie.
 *     operationId: login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/login', validate(signInSchema), asyncHandler(authController.login));

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Sends a password reset email to the specified address. Always returns 200 to prevent email enumeration.
 *     operationId: forgotPassword
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (or email not found — same response)
 */
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset user password (admin)
 *     description: Admin-only endpoint to reset another user's password by UID. Requires admin or super_admin role.
 *     operationId: resetPassword
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [uid, newPassword]
 *             properties:
 *               uid:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires admin role)
 */
router.post('/reset-password', authenticate, requireRole('admin', 'super_admin'), authRateLimit, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change own password
 *     description: Authenticated user changes their own password by providing the current password.
 *     operationId: changePassword
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Not authenticated
 *       400:
 *         description: Current password incorrect
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information.
 *     operationId: getProfile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 *   put:
 *     tags: [Auth]
 *     summary: Update profile
 *     description: Updates the authenticated user's display name, phone, or photo.
 *     operationId: updateProfile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               phoneNumber:
 *                 type: string
 *               photoURL:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Not authenticated
 */
router.get('/profile', authenticate, asyncHandler(authController.getProfile));
router.get('/me', authenticate, asyncHandler(authController.getProfile));
router.post('/verify-token', authenticate, asyncHandler(authController.verifyToken));
router.post('/refresh', validate(refreshTokenSchema), asyncHandler(authController.refresh));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out
 *     description: Invalidates the current session and clears cookies.
 *     operationId: logout
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));
router.get('/session', asyncHandler(authController.getSession));
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateProfile));

export default router;
