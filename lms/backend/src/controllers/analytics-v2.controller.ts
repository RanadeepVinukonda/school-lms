import { Request, Response } from 'express';
import * as analyticsV2Service from '../services/analytics-v2.service';
import { createNotification } from '../services/notification.service';
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

export async function getClassConcepts(req: Request, res: Response) {
  const result = await analyticsV2Service.getConceptsForClass(req.params.classId);
  sendSuccess(res, result);
}

export async function getConceptOversight(req: Request, res: Response) {
  const result = await analyticsV2Service.getConceptOversight();
  sendSuccess(res, result);
}

export async function notifyReTeach(req: Request, res: Response) {
  const { teacherId, className, subjectName, conceptName } = req.body;
  if (!teacherId || !className || !subjectName || !conceptName) {
    res.status(400).json({ success: false, message: 'Missing required fields: teacherId, className, subjectName, conceptName' });
    return;
  }
  await createNotification({
    userId: teacherId,
    type: 're_teach',
    title: 'Action Required: Re-teach Concept',
    body: `The administrator has requested that you re-teach the concept "${conceptName}" in "${className}" for the subject "${subjectName}" due to student performance dropping below the flagging threshold.`,
    priority: 'high',
  });
  sendSuccess(res, null, 'Teacher notified to re-teach concept');
}

export async function getConductedTests(req: Request, res: Response) {
  const result = await analyticsV2Service.getConductedTests();
  sendSuccess(res, result);
}
