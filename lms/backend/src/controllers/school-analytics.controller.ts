import { Request, Response } from 'express';
import * as schoolAnalyticsService from '../services/school-analytics.service';
import { sendSuccess } from '../utils/response';

export async function getGradeComparison(req: Request, res: Response) {
  const result = await schoolAnalyticsService.getGradeComparison();
  sendSuccess(res, result);
}

export async function getTeacherComparison(req: Request, res: Response) {
  const result = await schoolAnalyticsService.getTeacherComparison();
  sendSuccess(res, result);
}

export async function getClassComparison(req: Request, res: Response) {
  const result = await schoolAnalyticsService.getClassComparison();
  sendSuccess(res, result);
}

export async function getSchoolOverview(req: Request, res: Response) {
  const result = await schoolAnalyticsService.getSchoolOverview();
  sendSuccess(res, result);
}

export async function getPerformanceTrends(req: Request, res: Response) {
  const result = await schoolAnalyticsService.getPerformanceTrends();
  sendSuccess(res, result);
}
