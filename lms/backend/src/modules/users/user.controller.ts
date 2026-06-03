
import * as userService from "../../services/user.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const listUsers = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  const filters: Record<string, unknown> = {};
  if (req.query.role) filters.role = req.query.role;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.search) filters.search = req.query.search;
  const result = await userService.listUsers(filters, pagination);
  sendSuccess(res, "Users retrieved", {
    users: result.users,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, "User retrieved", user);
});

export const createUser = asyncHandler(async (req: AuthRequest, res) => {
  const user = await userService.createUser(req.body, req.user!.id);
  sendCreated(res, "User created", user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  sendSuccess(res, "User updated", user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  sendNoContent(res);
});

export const assignRole = asyncHandler(async (req, res) => {
  const user = await userService.assignRole(req.params.id, req.body.role);
  sendSuccess(res, "Role assigned", user);
});

