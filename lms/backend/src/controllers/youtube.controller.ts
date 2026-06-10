import { Request, Response } from 'express';
import * as youtubeService from '../services/youtube.service';
import { sendSuccess } from '../utils/response';

export async function search(req: Request, res: Response) {
  const { query, maxResults } = req.query;
  if (!query || typeof query !== 'string') {
    res.status(400).json({ success: false, message: 'Query parameter is required' });
    return;
  }
  const results = await youtubeService.searchVideos(query, maxResults ? parseInt(maxResults as string, 10) : 5);
  sendSuccess(res, results);
}

export async function searchForConcept(req: Request, res: Response) {
  const { subject, chapterTitle, conceptTitle } = req.body;
  if (!subject || !chapterTitle || !conceptTitle) {
    res.status(400).json({ success: false, message: 'subject, chapterTitle, and conceptTitle are required' });
    return;
  }
  const results = await youtubeService.searchVideosForConcept(subject, chapterTitle, conceptTitle);
  sendSuccess(res, results);
}
