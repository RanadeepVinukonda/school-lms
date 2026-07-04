import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { requireNoDependenciesOrThrow, getUserImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import type { AuditAction } from '../services/audit.service';
import { sendSuccess, sendCreated, sendPaginated, buildPaginationMeta } from '../utils/response';

type ReqWithUser = Request & { user?: { uid: string; role?: string; displayName?: string } };

type ListUsersQuery = {
  page?: string;
  limit?: string;
  role?: string;
  search?: string;
  status?: string;
  classId?: string;
  sortBy?: string;
  sortOrder?: string;
};


export async function listUsers(req: Request, res: Response) {
  const { items, total, page, limit } = await userService.listUsers({
    ...(req.query as unknown as ListUsersQuery),
    schoolId: req.user!.school_id,
  });
  const pagination = buildPaginationMeta(total, page, limit);
  sendPaginated(res, items, pagination);
}

export async function getUser(req: Request, res: Response) {
  const result = await userService.getUserByIdService(req.params.userId);
  sendSuccess(res, result);
}

export async function createUser(req: Request, res: Response) {
  const result = await userService.createUser({ ...req.body, schoolId: req.user!.school_id });
  logAudit(adminAuditEntry(req as ReqWithUser, 'user.create', result.uid, 'user', result.displayName, {
    newValue: { email: result.email, role: result.role, displayName: result.displayName },
    summary: `Created user "${result.displayName}" (${result.role})`,
  }));
  sendCreated(res, result, 'User created');
}

export async function updateUser(req: Request, res: Response) {
  const old = await userService.getUserByIdService(req.params.userId);
  const result = await userService.updateUser(req.params.userId, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'user.update', req.params.userId, 'user', old.displayName, {
    oldValue: old,
    newValue: result,
    summary: `Updated user "${old.displayName}"`,
  }));
  sendSuccess(res, result, 'User updated');
}

export async function deleteUser(req: Request, res: Response) {
  const user = await userService.getUserByIdService(req.params.userId);
  await requireNoDependenciesOrThrow('user', req.params.userId, getUserImpact);
  await userService.deleteUserService(req.params.userId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'user.delete', req.params.userId, 'user', user.displayName));
  sendSuccess(res, null, 'User deleted');
}

export async function toggleActive(req: Request, res: Response) {
  const user = await userService.getUserByIdService(req.params.userId);
  const result = await userService.toggleActive(req.params.userId);
  if (!result) { sendSuccess(res, null, 'User status toggled'); return; }
  const action = result.isActive ? 'user.activate' : 'user.deactivate';
  logAudit(adminAuditEntry(req as ReqWithUser, action as AuditAction, req.params.userId, 'user', user.displayName, {
    oldValue: { isActive: user.isActive },
    newValue: { isActive: result.isActive },
    summary: `${result.isActive ? 'Activated' : 'Deactivated'} user "${user.displayName}"`,
  }));
  sendSuccess(res, result, `User ${result.isActive ? 'activated' : 'deactivated'}`);
}

export async function assignRole(req: Request, res: Response) {
  const user = await userService.getUserByIdService(req.params.userId);
  const oldRole = user.role;
  await userService.assignRole(req.params.userId, req.body.role);
  logAudit(adminAuditEntry(req as ReqWithUser, 'role.change', req.params.userId, 'user', user.displayName, {
    oldValue: { role: oldRole },
    newValue: { role: req.body.role },
    summary: `Changed role of "${user.displayName}" from ${oldRole} to ${req.body.role}`,
  }));
  sendSuccess(res, null, 'Role assigned');
}

export async function updateProfile(req: Request, res: Response) {
  const result = await userService.updateProfile(req.user!.uid, req.body);
  sendSuccess(res, result, 'Profile updated');
}

export async function pingActive(req: Request, res: Response) {
  const result = await userService.pingActive(req.user!.uid);
  sendSuccess(res, result, 'Active ping recorded');
}

export async function getStrengthsWeaknesses(req: Request, res: Response) {
  const uid = req.params.userId || req.user!.uid;
  const result = await userService.getStrengthsWeaknesses(uid);
  sendSuccess(res, result);
}
