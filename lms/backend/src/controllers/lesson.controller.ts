import { Request, Response } from 'express';
import * as lessonService from '../services/lesson.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createLesson(req: Request, res: Response) {
  const result = await lessonService.createLesson(req.body);
  sendCreated(res, result, 'Lesson created');
}

export async function updateLesson(req: Request, res: Response) {
  const result = await lessonService.updateLesson(req.params.lessonId, req.body);
  sendSuccess(res, result, 'Lesson updated');
}

export async function deleteLesson(req: Request, res: Response) {
  await lessonService.deleteLesson(req.params.lessonId);
  sendSuccess(res, null, 'Lesson deleted');
}

export async function getLesson(req: Request, res: Response) {
  const result = await lessonService.getLessonById(req.params.lessonId);
  sendSuccess(res, result);
}

export async function listLessonsByCourse(req: Request, res: Response) {
  const result = await lessonService.listLessonsByCourse(req.params.courseId);
  sendSuccess(res, result);
}

export async function reorderLessons(req: Request, res: Response) {
  await lessonService.reorderLessons(req.body.lessonIds);
  sendSuccess(res, null, 'Lessons reordered');
}

export async function markLessonComplete(req: Request, res: Response) {
  await lessonService.markLessonComplete(req.params.lessonId, req.user!.uid);
  sendSuccess(res, null, 'Lesson marked complete');
}
