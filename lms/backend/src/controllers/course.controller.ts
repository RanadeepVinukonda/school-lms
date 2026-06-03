import { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createCourse(req: Request, res: Response) {
  const result = await courseService.createCourse(req.body);
  sendCreated(res, result, 'Course created');
}

export async function updateCourse(req: Request, res: Response) {
  const result = await courseService.updateCourse(req.params.courseId, req.body);
  sendSuccess(res, result, 'Course updated');
}

export async function deleteCourse(req: Request, res: Response) {
  await courseService.deleteCourse(req.params.courseId);
  sendSuccess(res, null, 'Course deleted');
}

export async function getCourse(req: Request, res: Response) {
  const result = await courseService.getCourseById(req.params.courseId);
  sendSuccess(res, result);
}

export async function listCourses(req: Request, res: Response) {
  const result = await courseService.listCourses(req.query as any);
  sendSuccess(res, result);
}

export async function enrollStudent(req: Request, res: Response) {
  await courseService.enrollStudent(req.params.courseId, req.body.studentId);
  sendSuccess(res, null, 'Student enrolled');
}

export async function unenrollStudent(req: Request, res: Response) {
  await courseService.unenrollStudent(req.params.courseId, req.body.studentId);
  sendSuccess(res, null, 'Student unenrolled');
}

export async function getEnrollments(req: Request, res: Response) {
  const result = await courseService.getEnrollments(req.params.courseId);
  sendSuccess(res, result);
}
