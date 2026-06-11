import { Request, Response } from 'express';
import * as analyticsV2Service from '../services/analytics-v2.service';
import { sendSuccess } from '../utils/response';

export async function getClassPerformance(req: Request, res: Response) {
  const result = await analyticsV2Service.getClassPerformance(req.params.classId);
  sendSuccess(res, result);
}

export async function getStudentPerformance(req: Request, res: Response) {
  const result = await analyticsV2Service.getStudentPerformance(req.params.studentId);
  sendSuccess(res, result);
}

export async function getAssessmentAnalytics(req: Request, res: Response) {
  const { type } = req.query;
  if (!type || !['quiz', 'assignment', 'exam'].includes(type as string)) {
    res.status(400).json({ success: false, message: 'type query param must be quiz, assignment, or exam' });
    return;
  }
  const result = await analyticsV2Service.getAssessmentAnalytics(req.params.assessmentId, type as 'quiz' | 'assignment' | 'exam');
  sendSuccess(res, result);
}
