import { Request, Response } from 'express';
import * as academicYearService from '../services/academic-year.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createAcademicYear(req: Request, res: Response) {
  const result = await academicYearService.createAcademicYear(req.body);
  sendCreated(res, result, 'Academic year created');
}

export async function updateAcademicYear(req: Request, res: Response) {
  const result = await academicYearService.updateAcademicYear(req.params.id, req.body);
  sendSuccess(res, result, 'Academic year updated');
}

export async function deleteAcademicYear(req: Request, res: Response) {
  await academicYearService.deleteAcademicYear(req.params.id);
  sendSuccess(res, null, 'Academic year deleted');
}

export async function getAcademicYear(req: Request, res: Response) {
  const result = await academicYearService.getAcademicYearById(req.params.id);
  sendSuccess(res, result);
}

export async function listAcademicYears(req: Request, res: Response) {
  const result = await academicYearService.listAcademicYears(req.query as any);
  sendSuccess(res, result);
}

export async function getCurrentAcademicYear(_req: Request, res: Response) {
  const result = await academicYearService.getCurrentAcademicYear();
  sendSuccess(res, result);
}
