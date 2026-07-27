import { Request, Response } from 'express';
import * as virtualLabsService from '../services/virtual-labs.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function getAllLabs(_req: Request, res: Response) {
  const labs = await virtualLabsService.getAllLabs();
  sendSuccess(res, labs);
}

export async function getLabById(req: Request, res: Response) {
  const lab = await virtualLabsService.getLabById(req.params.id);
  sendSuccess(res, lab);
}

export async function createLab(req: Request, res: Response) {
  const lab = await virtualLabsService.createLab(req.body);
  sendCreated(res, lab, 'Virtual lab created');
}

export async function updateLab(req: Request, res: Response) {
  const lab = await virtualLabsService.updateLab(req.params.id, req.body);
  sendSuccess(res, lab, 'Virtual lab updated');
}

export async function deleteLab(req: Request, res: Response) {
  await virtualLabsService.deleteLab(req.params.id);
  sendSuccess(res, null, 'Virtual lab deleted');
}

export async function markLabCompleted(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const studentId = req.user.uid;
  const result = await virtualLabsService.markLabCompleted(studentId, req.params.id);
  sendCreated(res, result, 'Lab marked as completed');
}

export async function getStudentProgress(req: Request, res: Response) {
  const progress = await virtualLabsService.getStudentProgress(req.params.studentId);
  sendSuccess(res, progress);
}
