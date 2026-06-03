
import * as assignmentService from "../../services/assignment.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const createAssignment = asyncHandler(async (req: AuthRequest, res) => {
  const assignment = await assignmentService.createAssignment(req.body, req.user!.id);
  sendCreated(res, "Assignment created", assignment);
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.updateAssignment(req.params.id, req.body);
  sendSuccess(res, "Assignment updated", assignment);
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  await assignmentService.deleteAssignment(req.params.id);
  sendNoContent(res);
});

export const getAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.getAssignmentById(req.params.id);
  sendSuccess(res, "Assignment retrieved", assignment);
});

export const listAssignmentsByCourse = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await assignmentService.listAssignmentsByCourse(req.params.courseId, pagination);
  sendSuccess(res, "Assignments retrieved", {
    assignments: result.assignments,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

