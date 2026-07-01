import { Request, Response } from 'express';
import * as lessonService from '../services/lesson.service';
import { requireNoDependenciesOrThrow, getLessonImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReqWithUser, QueryParams } from '../types/common';

export async function createLesson(req: Request, res: Response) {
  const result = await lessonService.createLesson({ ...req.body, schoolId: req.user!.school_id });
  logAudit(adminAuditEntry(req as ReqWithUser, 'lesson.create', result.id, 'lesson', result.title, {
    newValue: result,
    summary: `Created lesson "${result.title}"`,
  }));
  sendCreated(res, result, 'Lesson created');
}

export async function updateLesson(req: Request, res: Response) {
  const old = await lessonService.getLessonById(req.params.lessonId);
  const result = await lessonService.updateLesson(req.params.lessonId, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'lesson.update', req.params.lessonId, 'lesson', old.title, {
    oldValue: old,
    newValue: result,
    summary: `Updated lesson "${old.title}"`,
  }));
  sendSuccess(res, result, 'Lesson updated');
}

export async function deleteLesson(req: Request, res: Response) {
  const lesson = await lessonService.getLessonById(req.params.lessonId);
  await requireNoDependenciesOrThrow('lesson', req.params.lessonId, getLessonImpact);
  await lessonService.deleteLesson(req.params.lessonId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'lesson.delete', req.params.lessonId, 'lesson', lesson.title));
  sendSuccess(res, null, 'Lesson deleted');
}

export async function getLesson(req: Request, res: Response) {
  const result = await lessonService.getLessonById(req.params.lessonId);
  sendSuccess(res, result);
}

export async function listLessonsByCourse(req: Request, res: Response) {
  const result = await lessonService.listLessonsByCourse(req.params.courseId, req.user!.school_id);
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
