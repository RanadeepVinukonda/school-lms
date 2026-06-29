import { Request, Response } from 'express';
import * as contentPublishingService from '../services/content-publishing.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function publishContent(req: Request, res: Response) {
  const result = await contentPublishingService.publishContent({ ...req.body, teacherId: req.user!.uid });
  sendCreated(res, result, 'Content published successfully');
}

export async function getPublishedContent(req: Request, res: Response) {
  const result = await contentPublishingService.getPublishedContent(
    req.params.classId,
    req.query.contentType as any,
  );
  sendSuccess(res, result);
}

export async function unpublishContent(req: Request, res: Response) {
  await contentPublishingService.unpublishContent(req.params.publishId, req.user!.uid);
  sendSuccess(res, null, 'Content unpublished');
}

export async function getContentStats(req: Request, res: Response) {
  const result = await contentPublishingService.getContentStats(req.user!.uid);
  sendSuccess(res, result);
}

export async function scheduleContent(req: Request, res: Response) {
  const result = await contentPublishingService.scheduleContent({ ...req.body, teacherId: req.user!.uid });
  sendCreated(res, result, 'Content scheduled');
}

export async function getStudentContent(req: Request, res: Response) {
  const userDoc = await (await import('../database/adapter')).collections.users().doc(req.user!.uid).get();
  const classIds = userDoc.data()?.classIds || [];
  const result = await contentPublishingService.getPublishedContentForStudent(req.user!.uid, classIds);
  sendSuccess(res, result);
}
