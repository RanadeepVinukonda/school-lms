import { Request, Response } from 'express';
import * as classService from '../services/class.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createClass(req: Request, res: Response) {
  const result = await classService.createClass(req.body);
  sendCreated(res, result, 'Class created');
}

export async function updateClass(req: Request, res: Response) {
  const result = await classService.updateClass(req.params.classId, req.body);
  sendSuccess(res, result, 'Class updated');
}

export async function deleteClass(req: Request, res: Response) {
  await classService.deleteClass(req.params.classId);
  sendSuccess(res, null, 'Class deleted');
}

export async function listClasses(req: Request, res: Response) {
  const result = await classService.listClasses(req.query as any);
  sendSuccess(res, result);
}

export async function getClass(req: Request, res: Response) {
  const result = await classService.getClassById(req.params.classId);
  sendSuccess(res, result);
}

export async function addStudents(req: Request, res: Response) {
  await classService.addStudents(req.params.classId, req.body.studentIds);
  sendSuccess(res, null, 'Students added');
}

export async function removeStudents(req: Request, res: Response) {
  await classService.removeStudents(req.params.classId, req.body.studentIds);
  sendSuccess(res, null, 'Students removed');
}

export async function getRoster(req: Request, res: Response) {
  const result = await classService.getRoster(req.params.classId);
  sendSuccess(res, result);
}
