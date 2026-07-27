import { Request, Response } from 'express';
import * as teacherVideoService from '../services/teacher-video.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { requireUser } from '../types/common';

export async function addVideo(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await teacherVideoService.addVideo({ ...req.body, teacherId: user.uid });
  sendCreated(res, result, 'Video added to library');
}

export async function listVideos(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await teacherVideoService.listVideos(user.uid, req.query as Record<string, unknown>);
  sendSuccess(res, result);
}

export async function removeVideo(req: Request, res: Response) {
  const user = requireUser(req);
  await teacherVideoService.removeVideo(req.params.videoId, user.uid);
  sendSuccess(res, null, 'Video removed');
}

export async function attachToConcept(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await teacherVideoService.attachVideoToConcept(req.params.videoId, user.uid, req.body);
  sendSuccess(res, result, 'Video attached to concept');
}

export async function searchAndSave(req: Request, res: Response) {
  const user = requireUser(req);
  const { query, maxResults } = req.body;
  const result = await teacherVideoService.searchAndSave(user.uid, query, maxResults);
  sendSuccess(res, result, 'Videos saved to library');
}
