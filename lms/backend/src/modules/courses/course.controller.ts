
import * as courseService from "../../services/course.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const listCourses = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  const filters: Record<string, unknown> = {};
  if (req.query.subject) filters.subject = req.query.subject;
  if (req.query.level) filters.level = req.query.level;
  if (req.query.search) filters.search = req.query.search;
  const result = await courseService.listCourses(filters, pagination);
  sendSuccess(res, "Courses retrieved", {
    courses: result.courses,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getCourseById = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseById(req.params.id);
  sendSuccess(res, "Course retrieved", course);
});

export const createCourse = asyncHandler(async (req: AuthRequest, res) => {
  const course = await courseService.createCourse(req.body, req.user!.id);
  sendCreated(res, "Course created", course);
});

export const updateCourse = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.body);
  sendSuccess(res, "Course updated", course);
});

export const deleteCourse = asyncHandler(async (req, res) => {
  await courseService.deleteCourse(req.params.id);
  sendNoContent(res);
});

export const enrollStudent = asyncHandler(async (req, res) => {
  const enrollment = await courseService.enrollStudent(req.params.id, req.body.studentId);
  sendSuccess(res, "Student enrolled", enrollment);
});

export const unenrollStudent = asyncHandler(async (req, res) => {
  await courseService.unenrollStudent(req.params.id, req.body.studentId);
  sendNoContent(res);
});

export const getEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await courseService.getEnrollments(req.params.id);
  sendSuccess(res, "Enrollments retrieved", enrollments);
});

