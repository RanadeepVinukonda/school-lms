
import * as classService from "../../services/class.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const listClasses = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const filters: Record<string, unknown> = {};
  if (req.query.grade) filters.grade = req.query.grade;
  if (req.query.section) filters.section = req.query.section;
  if (req.query.teacherId) filters.teacherId = req.query.teacherId;
  const result = await classService.listClasses(filters, pagination);
  sendSuccess(res, "Classes retrieved", {
    classes: result.classes,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getClassById = asyncHandler(async (req, res) => {
  const cls = await classService.getClassById(req.params.id);
  sendSuccess(res, "Class retrieved", cls);
});

export const createClass = asyncHandler(async (req: AuthRequest, res) => {
  const cls = await classService.createClass(req.body, req.user!.id);
  sendCreated(res, "Class created", cls);
});

export const updateClass = asyncHandler(async (req, res) => {
  const cls = await classService.updateClass(req.params.id, req.body);
  sendSuccess(res, "Class updated", cls);
});

export const deleteClass = asyncHandler(async (req, res) => {
  await classService.deleteClass(req.params.id);
  sendNoContent(res);
});

export const addStudents = asyncHandler(async (req, res) => {
  const cls = await classService.addStudents(req.params.id, req.body.studentIds);
  sendSuccess(res, "Students added", cls);
});

export const removeStudents = asyncHandler(async (req, res) => {
  const cls = await classService.removeStudents(req.params.id, req.body.studentIds);
  sendSuccess(res, "Students removed", cls);
});

export const getRoster = asyncHandler(async (req, res) => {
  const roster = await classService.getRoster(req.params.id);
  sendSuccess(res, "Roster retrieved", roster);
});

