import * as authService from "../../services/auth.service";
import * as userService from "../../services/user.service";
import { sendSuccess, sendCreated } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendCreated(res, "Registration successful", result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  sendSuccess(res, "Login successful", result);
});

export const verifyToken = asyncHandler(async (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const result = await authService.verifyToken(token);
  sendSuccess(res, "Token verified", result);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, "Password reset email sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, "Password reset successful");
});

export const changePassword = asyncHandler(async (req: AuthRequest, res) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, "Password changed successfully");
});

export const getProfile = asyncHandler(async (req: AuthRequest, res) => {
  const user = await userService.getUserById(req.user!.id);
  sendSuccess(res, "Profile retrieved", user);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res) => {
  const user = await userService.updateUser(req.user!.id, req.body);
  sendSuccess(res, "Profile updated", user);
});

