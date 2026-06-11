import { Request, Response } from 'express';
import * as teacherVideoService from '../services/teacher-video.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function addVideo(req: Request, res: Response) {
  const result = await teacherVideoService.addVideo({ ...req.body, teacherId: req.user!.uid });
  sendCreated(res, result, 'Video added to library');
}

export async function listVideos(req: Request, res: Response) {
  const result = await teacherVideoService.listVideos(req.user!.uid, req.query as any);
  sendSuccess(res, result);
}

export async function removeVideo(req: Request, res: Response) {
  await teacherVideoService.removeVideo(req.params.videoId, req.user!.uid);
  sendSuccess(res, null, 'Video removed');
}

export async function attachToConcept(req: Request, res: Response) {
  const result = await teacherVideoService.attachVideoToConcept(req.params.videoId, req.user!.uid, req.body);
  sendSuccess(res, result, 'Video attached to concept');
}

export async function searchAndSave(req: Request, res: Response) {
  const { query, maxResults } = req.body;
  const result = await teacherVideoService.searchAndSave(req.user!.uid, query, maxResults);
  sendSuccess(res, result, 'Videos saved to library');
}
