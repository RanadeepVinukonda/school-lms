import { Request, Response } from 'express';
import * as educationalVideoService from '../services/educational-video.service';
import { sendSuccess } from '../utils/response';

export async function searchVideos(req: Request, res: Response) {
  const { query, maxResults } = req.query;
  const results = await educationalVideoService.searchEducationalVideos(
    query as string,
    maxResults ? parseInt(maxResults as string, 10) : 8,
  );
  sendSuccess(res, results);
}

export async function searchVideosForConcept(req: Request, res: Response) {
  const { subject, conceptTitle, maxResults } = req.body;
  const results = await educationalVideoService.searchEducationalVideosForConcept(
    subject,
    conceptTitle,
    maxResults || 5,
  );
  sendSuccess(res, results);
}
