import { Request, Response } from 'express';
import * as contentPublishingService from '../services/content-publishing.service';
import { getSupabaseClient } from '../services/supabase';
import { sendSuccess, sendCreated } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function publishContent(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await contentPublishingService.publishContent({ ...req.body, teacherId: req.user.uid });
  sendCreated(res, result, 'Content published successfully');
}

export async function getPublishedContent(req: Request, res: Response) {
  const result = await contentPublishingService.getPublishedContent(
    req.params.classId,
    req.query.contentType as 'test' | 'resource' | 'mindmap' | 'video' | 'note' | 'material' | undefined,
  );
  sendSuccess(res, result);
}

export async function unpublishContent(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  await contentPublishingService.unpublishContent(req.params.publishId, req.user.uid);
  sendSuccess(res, null, 'Content unpublished');
}

export async function getContentStats(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await contentPublishingService.getContentStats(req.user.uid);
  sendSuccess(res, result);
}

export async function scheduleContent(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await contentPublishingService.scheduleContent({ ...req.body, teacherId: req.user.uid });
  sendCreated(res, result, 'Content scheduled');
}

export async function getStudentContent(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const supabase = getSupabaseClient();
  const { data: userDoc } = supabase
    ? await supabase.from('users').select('classIds').eq('id', req.user.uid).single()
    : { data: null };
  const classIds = ((userDoc as Record<string, unknown>)?.classIds as string[]) || [];
  const result = await contentPublishingService.getPublishedContentForStudent(req.user.uid, classIds);
  sendSuccess(res, result);
}
