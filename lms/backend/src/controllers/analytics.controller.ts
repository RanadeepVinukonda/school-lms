import { Request, Response } from 'express';
import * as analyticsService from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export async function getStudentDashboard(req: Request, res: Response) {
  const result = await analyticsService.getStudentDashboard(req.user!.uid);
  sendSuccess(res, result);
}

export async function getTeacherDashboard(req: Request, res: Response) {
  const result = await analyticsService.getTeacherDashboard(req.user!.uid);
  sendSuccess(res, result);
}

export async function getAdminDashboard(req: Request, res: Response) {
  const result = await analyticsService.getAdminDashboard();
  sendSuccess(res, result);
}

export async function getCourseAnalytics(req: Request, res: Response) {
  const result = await analyticsService.getCourseAnalytics(req.params.courseId);
  sendSuccess(res, result);
}
