import { Request, Response } from 'express';
import * as teacherVideoService from '../services/teacher-video.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { requireUser } from '../types/common';

export async function addVideo(req: Request, res: Response) {
  const user = requireUser(req);

  const body = {
    teacherId: user.uid,
    title: req.body.title || '',
    videoId: req.body.videoId || req.body.youtubeId || '',
    source: req.body.source || 'youtube',
    sourceLabel: req.body.sourceLabel || 'YouTube',
    thumbnail: req.body.thumbnail || '',
    duration: req.body.duration || '0:00',
    channelName: req.body.channelName || req.body.channelTitle || '',
    description: req.body.description || '',
    embedUrl: req.body.embedUrl || req.body.url || '',
    url: req.body.url || req.body.embedUrl || '',
    textbookId: req.body.textbookId,
    chapterId: req.body.chapterId,
    conceptId: req.body.conceptId,
    tags: req.body.tags,
  };

  const result = await teacherVideoService.addVideo(body);
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
