
import * as gradeService from "../../services/grade.service";
import { sendSuccess, buildPaginationMeta } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const getStudentGrades = asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.params.studentId ?? req.user!.id;
  const grades = await gradeService.getStudentGrades(userId, req.query);
  sendSuccess(res, "Grades retrieved", grades);
});

export const getGradebook = asyncHandler(async (req, res) => {
  const result = await gradeService.getGradebook(req.params.courseId, req.query);
  sendSuccess(res, "Gradebook retrieved", {
    students: result.students,
    meta: buildPaginationMeta(result.total, { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 50 }),
  });
});

export const updateGrade = asyncHandler(async (req, res) => {
  const grade = await gradeService.updateGrade(req.params.id, req.body);
  sendSuccess(res, "Grade updated", grade);
});

export const bulkUpdateGrades = asyncHandler(async (req, res) => {
  const grades = await gradeService.bulkUpdateGrades(req.body.grades);
  sendSuccess(res, "Grades updated", grades);
});

export const generateReport = asyncHandler(async (req, res) => {
  const report = await gradeService.generateReport(req.params.courseId, req.query);
  sendSuccess(res, "Report generated", report);
});

