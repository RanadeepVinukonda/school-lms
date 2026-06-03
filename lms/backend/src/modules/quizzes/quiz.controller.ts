
import * as quizService from "../../services/quiz.service";
import { sendSuccess, sendCreated, sendNoContent } from "../../utils/response";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const createQuiz = asyncHandler(async (req: AuthRequest, res) => {
  const quiz = await quizService.createQuiz(req.body, req.user!.id);
  sendCreated(res, "Quiz created", quiz);
});

export const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await quizService.updateQuiz(req.params.id, req.body);
  sendSuccess(res, "Quiz updated", quiz);
});

export const deleteQuiz = asyncHandler(async (req, res) => {
  await quizService.deleteQuiz(req.params.id);
  sendNoContent(res);
});

export const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await quizService.getQuizById(req.params.id);
  sendSuccess(res, "Quiz retrieved", quiz);
});

export const listQuizzesByCourse = asyncHandler(async (req, res) => {
  const quizzes = await quizService.listQuizzesByCourse(req.params.courseId);
  sendSuccess(res, "Quizzes retrieved", quizzes);
});

export const startAttempt = asyncHandler(async (req: AuthRequest, res) => {
  const attempt = await quizService.startAttempt(req.params.id, req.user!.id);
  sendSuccess(res, "Attempt started", attempt);
});

export const submitAttempt = asyncHandler(async (req: AuthRequest, res) => {
  const result = await quizService.submitAttempt(req.params.id, req.user!.id, req.body);
  sendSuccess(res, "Quiz submitted", result);
});

export const getResults = asyncHandler(async (req: AuthRequest, res) => {
  const results = await quizService.getResults(req.params.id, req.user!.id);
  sendSuccess(res, "Results retrieved", results);
});

