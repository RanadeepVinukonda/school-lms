import { Request, Response } from 'express';
import * as schoolAnalyticsService from '../services/school-analytics.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function getGradeComparison(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await schoolAnalyticsService.getGradeComparison(req.user.school_id);
  sendSuccess(res, result);
}

export async function getTeacherComparison(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await schoolAnalyticsService.getTeacherComparison(req.user.school_id);
  sendSuccess(res, result);
}

export async function getClassComparison(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await schoolAnalyticsService.getClassComparison(req.user.school_id);
  sendSuccess(res, result);
}

export async function getSchoolOverview(_req: Request, res: Response) {
  const result = await schoolAnalyticsService.getSchoolOverview();
  sendSuccess(res, result);
}

export async function getPerformanceTrends(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await schoolAnalyticsService.getPerformanceTrends(req.user.school_id);
  sendSuccess(res, result);
}
