import { Request, Response } from 'express';
import * as subjectService from '../services/subject.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createSubject(req: Request, res: Response) {
  const result = await subjectService.createSubject(req.body);
  sendCreated(res, result, 'Subject created');
}

export async function updateSubject(req: Request, res: Response) {
  const result = await subjectService.updateSubject(req.params.subjectId, req.body);
  sendSuccess(res, result, 'Subject updated');
}

export async function deleteSubject(req: Request, res: Response) {
  await subjectService.deleteSubject(req.params.subjectId);
  sendSuccess(res, null, 'Subject deleted');
}

export async function listSubjects(req: Request, res: Response) {
  const result = await subjectService.listSubjects(req.query as any);
  sendSuccess(res, result);
}

export async function getSubject(req: Request, res: Response) {
  const result = await subjectService.getSubjectById(req.params.subjectId);
  sendSuccess(res, result);
}
