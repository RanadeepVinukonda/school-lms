import { Request, Response } from 'express';
import * as questionPaperService from '../services/question-paper.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createPaper(req: Request, res: Response) {
  const result = await questionPaperService.createPaper({ ...req.body, createdBy: req.user!.uid });
  sendCreated(res, result, 'Question paper created');
}

export async function updatePaper(req: Request, res: Response) {
  const result = await questionPaperService.updatePaper(req.params.id, req.user!.uid, req.body);
  sendSuccess(res, result, 'Question paper updated');
}

export async function deletePaper(req: Request, res: Response) {
  await questionPaperService.deletePaper(req.params.id, req.user!.uid);
  sendSuccess(res, null, 'Question paper deleted');
}

export async function getPaper(req: Request, res: Response) {
  const result = await questionPaperService.getPaper(req.params.id);
  sendSuccess(res, result);
}

export async function listPapers(req: Request, res: Response) {
  const result = await questionPaperService.listPapers(req.query as any);
  sendSuccess(res, result);
}
