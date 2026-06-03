
import * as assignmentService from "../../services/assignment.service";
import { sendSuccess, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const submitAssignment = asyncHandler(async (req: AuthRequest, res) => {
  const submission = await assignmentService.submitAssignment(req.params.assignmentId, req.user!.id, req.body);
  sendSuccess(res, "Submission created", submission);
});

export const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await assignmentService.gradeSubmission(req.params.id, req.body);
  sendSuccess(res, "Submission graded", submission);
});

export const listSubmissions = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const filters: Record<string, unknown> = {};
  if (req.query.studentId) filters.studentId = req.query.studentId;
  if (req.query.status) filters.status = req.query.status;
  const result = await assignmentService.listSubmissions(req.params.assignmentId, filters, pagination);
  sendSuccess(res, "Submissions retrieved", {
    submissions: result.submissions,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

