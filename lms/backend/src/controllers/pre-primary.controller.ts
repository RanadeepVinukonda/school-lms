import { Request, Response } from 'express';
import * as prePrimaryService from '../services/pre-primary.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function getDashboard(req: Request, res: Response) {
  const result = await prePrimaryService.getDashboardData(req.params.studentId);
  sendSuccess(res, result);
}

export async function getLessons(req: Request, res: Response) {
  const result = await prePrimaryService.getLessons();
  sendSuccess(res, result);
}

export async function getFlashcards(req: Request, res: Response) {
  const result = await prePrimaryService.getFlashcards(req.params.subjectId);
  sendSuccess(res, result);
}

export async function getStories(req: Request, res: Response) {
  const result = await prePrimaryService.getStories();
  sendSuccess(res, result);
}

export async function saveTracing(req: Request, res: Response) {
  const result = await prePrimaryService.saveTracing(req.body);
  sendCreated(res, result, 'Tracing saved');
}

export async function updateProgress(req: Request, res: Response) {
  const result = await prePrimaryService.updateProgress(req.params.studentId, req.body);
  sendSuccess(res, result, 'Progress updated');
}
