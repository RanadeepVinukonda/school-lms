import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  sendCreated(res, result, 'Registration successful');
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendSuccess(res, result, 'Login successful');
}

export async function getProfile(req: Request, res: Response) {
  const result = await authService.getUserProfile(req.user!.uid);
  sendSuccess(res, result);
}

export async function updateProfile(req: Request, res: Response) {
  const result = await authService.updateUserProfile(req.user!.uid, req.body);
  sendSuccess(res, result, 'Profile updated');
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, result);
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, null, 'Password reset successful');
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.uid, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, null, 'Password changed successfully');
}

export async function verifyToken(req: Request, res: Response) {
  sendSuccess(res, { valid: true });
}

export async function logout(_req: Request, res: Response) {
  sendSuccess(res, null, 'Logged out successfully');
}
