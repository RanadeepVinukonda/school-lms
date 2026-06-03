
import * as lessonService from "../../services/lesson.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const createLesson = asyncHandler(async (req: AuthRequest, res) => {
  const lesson = await lessonService.createLesson(req.body, req.user!.id);
  sendCreated(res, "Lesson created", lesson);
});

export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await lessonService.updateLesson(req.params.id, req.body);
  sendSuccess(res, "Lesson updated", lesson);
});

export const deleteLesson = asyncHandler(async (req, res) => {
  await lessonService.deleteLesson(req.params.id);
  sendNoContent(res);
});

export const getLessonById = asyncHandler(async (req, res) => {
  const lesson = await lessonService.getLessonById(req.params.id);
  sendSuccess(res, "Lesson retrieved", lesson);
});

export const listLessonsByCourse = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const result = await lessonService.listLessonsByCourse(req.params.courseId, pagination);
  sendSuccess(res, "Lessons retrieved", {
    lessons: result.lessons,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const reorderLessons = asyncHandler(async (req, res) => {
  const lessons = await lessonService.reorderLessons(req.params.courseId, req.body.lessonIds);
  sendSuccess(res, "Lessons reordered", lessons);
});

export const markLessonComplete = asyncHandler(async (req: AuthRequest, res) => {
  const progress = await lessonService.markLessonComplete(req.params.id, req.user!.id);
  sendSuccess(res, "Progress updated", progress);
});

