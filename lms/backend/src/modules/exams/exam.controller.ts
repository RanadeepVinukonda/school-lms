
import * as examService from "../../services/exam.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const createExam = asyncHandler(async (req: AuthRequest, res) => {
  const exam = await examService.createExam(req.body, req.user!.id);
  sendCreated(res, "Exam created", exam);
});

export const updateExam = asyncHandler(async (req, res) => {
  const exam = await examService.updateExam(req.params.id, req.body);
  sendSuccess(res, "Exam updated", exam);
});

export const deleteExam = asyncHandler(async (req, res) => {
  await examService.deleteExam(req.params.id);
  sendNoContent(res);
});

export const getExamById = asyncHandler(async (req, res) => {
  const exam = await examService.getExamById(req.params.id);
  sendSuccess(res, "Exam retrieved", exam);
});

export const listExamsByCourse = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await examService.listExamsByCourse(req.params.courseId, pagination);
  sendSuccess(res, "Exams retrieved", { exams: result.exams, pagination: buildPaginationMeta(result.total, pagination) });
});

export const scheduleExam = asyncHandler(async (req, res) => {
  const exam = await examService.scheduleExam(req.params.id, req.body);
  sendSuccess(res, "Exam scheduled", exam);
});

export const startAttempt = asyncHandler(async (req: AuthRequest, res) => {
  const attempt = await examService.startAttempt(req.params.id, req.user!.id);
  sendSuccess(res, "Attempt started", attempt);
});

export const submitAttempt = asyncHandler(async (req: AuthRequest, res) => {
  const result = await examService.submitAttempt(req.params.attemptId, req.user!.id, req.body);
  sendSuccess(res, "Attempt submitted", result);
});

export const gradeAttempt = asyncHandler(async (req, res) => {
  const result = await examService.gradeAttempt(req.params.attemptId, req.body);
  sendSuccess(res, "Attempt graded", result);
});

export const getResults = asyncHandler(async (req: AuthRequest, res) => {
  const results = await examService.getResults(req.params.id, req.user!.id);
  sendSuccess(res, "Results retrieved", results);
});

