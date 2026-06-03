import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function listUsers(req: Request, res: Response) {
  const result = await userService.listUsers(req.query as any);
  sendSuccess(res, result);
}

export async function getUser(req: Request, res: Response) {
  const result = await userService.getUserByIdService(req.params.userId);
  sendSuccess(res, result);
}

export async function createUser(req: Request, res: Response) {
  const result = await userService.createUser(req.body);
  sendCreated(res, result, 'User created');
}

export async function updateUser(req: Request, res: Response) {
  const result = await userService.updateUser(req.params.userId, req.body);
  sendSuccess(res, result, 'User updated');
}

export async function deleteUser(req: Request, res: Response) {
  await userService.deleteUserService(req.params.userId);
  sendSuccess(res, null, 'User deleted');
}

export async function assignRole(req: Request, res: Response) {
  await userService.assignRole(req.params.userId, req.body.role);
  sendSuccess(res, null, 'Role assigned');
}

export async function updateProfile(req: Request, res: Response) {
  const result = await userService.updateProfile(req.user!.uid, req.body);
  sendSuccess(res, result, 'Profile updated');
}
