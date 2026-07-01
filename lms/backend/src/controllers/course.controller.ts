import { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import { requireNoDependenciesOrThrow, getCourseImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReqWithUser, QueryParams } from '../types/common';

export async function createCourse(req: Request, res: Response) {
  const result = await courseService.createCourse({ ...req.body, schoolId: req.user!.school_id });
  logAudit(adminAuditEntry(req as ReqWithUser, 'course.create', result.id, 'course', result.title, {
    newValue: result,
    summary: `Created course "${result.title}"`,
  }));
  sendCreated(res, result, 'Course created');
}

export async function updateCourse(req: Request, res: Response) {
  const old = await courseService.getCourseById(req.params.courseId);
  const result = await courseService.updateCourse(req.params.courseId, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'course.update', req.params.courseId, 'course', old.title, {
    oldValue: old,
    newValue: result,
    summary: `Updated course "${old.title}"`,
  }));
  sendSuccess(res, result, 'Course updated');
}

export async function deleteCourse(req: Request, res: Response) {
  const course = await courseService.getCourseById(req.params.courseId);
  await requireNoDependenciesOrThrow('course', req.params.courseId, getCourseImpact);
  await courseService.deleteCourse(req.params.courseId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'course.delete', req.params.courseId, 'course', course.title));
  sendSuccess(res, null, 'Course deleted');
}

export async function getCourse(req: Request, res: Response) {
  const result = await courseService.getCourseById(req.params.courseId);
  sendSuccess(res, result);
}

export async function listCourses(req: Request, res: Response) {
  const result = await courseService.listCourses({
    ...(req.query as QueryParams),
    schoolId: req.user!.school_id,
  });
  sendSuccess(res, result);
}

export async function enrollStudent(req: Request, res: Response) {
  await courseService.enrollStudent(req.params.courseId, req.body.studentId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'enrollment.create', `${req.params.courseId}_${req.body.studentId}`, 'enrollment', req.body.studentId, {
    summary: `Enrolled student ${req.body.studentId} in course ${req.params.courseId}`,
  }));
  sendSuccess(res, null, 'Student enrolled');
}

export async function unenrollStudent(req: Request, res: Response) {
  await courseService.unenrollStudent(req.params.courseId, req.body.studentId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'enrollment.delete', `${req.params.courseId}_${req.body.studentId}`, 'enrollment', req.body.studentId, {
    summary: `Unenrolled student ${req.body.studentId} from course ${req.params.courseId}`,
  }));
  sendSuccess(res, null, 'Student unenrolled');
}

export async function getEnrollments(req: Request, res: Response) {
  const result = await courseService.getEnrollments(req.params.courseId);
  sendSuccess(res, result);
}
