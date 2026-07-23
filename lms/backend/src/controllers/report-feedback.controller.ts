import { Request, Response } from 'express';
import * as reportFeedbackService from '../services/report-feedback.service';
import { sendSuccess } from '../utils/response';

export async function createReport(req: Request, res: Response) {
  const result = await reportFeedbackService.createReport({
    userId: req.user!.uid,
    userName: req.body.userName,
    userRole: req.body.userRole,
    className: req.body.className,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
  });
  sendSuccess(res, result, 'Report submitted successfully');
}

export async function getReports(req: Request, res: Response) {
  const result = await reportFeedbackService.getReports(req.query as any);
  sendSuccess(res, result);
}

export async function getReportById(req: Request, res: Response) {
  const result = await reportFeedbackService.getReportById(req.params.id);
  sendSuccess(res, result);
}

export async function updateReportStatus(req: Request, res: Response) {
  await reportFeedbackService.updateReportStatus(req.params.id, req.body);
  sendSuccess(res, null, 'Report updated');
}

export async function getReportStats(req: Request, res: Response) {
  const result = await reportFeedbackService.getReportStats();
  sendSuccess(res, result);
}
