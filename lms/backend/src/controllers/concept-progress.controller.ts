import { Request, Response } from 'express';
import * as conceptProgressService from '../services/concept-progress.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function toggleCompletion(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { conceptId, textbookId, chapterId, classId } = req.body;
  const result = await conceptProgressService.toggleConceptCompletion({
    conceptId,
    textbookId,
    chapterId,
    classId,
    teacherId: req.user.uid,
  });
  sendSuccess(res, result, 'Concept completion toggled');
}

export async function getStatus(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { conceptId, classId } = req.params;
  const completed = await conceptProgressService.getConceptCompletionStatus(
    conceptId,
    classId,
    req.user.uid,
  );
  sendSuccess(res, { completed });
}

export async function getClassStatus(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { classId } = req.params;
  const result = await conceptProgressService.getClassCompletionStatus(
    classId,
    req.user.uid,
  );
  sendSuccess(res, result);
}

export async function getSubjectProgress(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { subjectId, classId } = req.params;
  const result = await conceptProgressService.getSubjectProgress(
    subjectId,
    classId,
    req.user.uid,
  );
  sendSuccess(res, result);
}

export async function getStudentProgress(req: Request, res: Response) {
  const { classId } = req.params;
  const result = await conceptProgressService.getStudentProgress(classId);
  sendSuccess(res, result);
}
