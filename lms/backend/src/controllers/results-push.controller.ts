import { Request, Response } from 'express';
import * as resultsPushService from '../services/results-push.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function releaseBatch(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { classId, type } = req.body;
  const result = await resultsPushService.releaseAssessmentsForClass(classId, req.user.uid, { type });
  sendSuccess(res, result, `Released grades for ${result.updatedCount} assessments`);
}

export async function releaseSingle(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { assessmentId, type } = req.body;
  const result = await resultsPushService.releaseSingleAssessment(assessmentId, type, req.user.uid);
  sendSuccess(res, result, 'Grades released');
}
