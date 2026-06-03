import { Request, Response } from 'express';
import * as gradeService from '../services/grade.service';
import { sendSuccess } from '../utils/response';

export async function getStudentGrades(req: Request, res: Response) {
  const result = await gradeService.getStudentGrades(req.params.studentId, req.query.academicYear as string);
  sendSuccess(res, result);
}

export async function getGradebook(req: Request, res: Response) {
  const result = await gradeService.getGradebook(req.query as any);
  sendSuccess(res, result);
}

export async function updateGrade(req: Request, res: Response) {
  const result = await gradeService.updateGrade(req.params.gradeId, { ...req.body, gradedBy: req.user!.uid });
  sendSuccess(res, result, 'Grade updated');
}

export async function bulkUpdateGrades(req: Request, res: Response) {
  const result = await gradeService.bulkUpdate(req.body.grades, req.params.courseId, req.user!.uid);
  sendSuccess(res, result, 'Grades updated');
}

export async function generateReport(req: Request, res: Response) {
  const result = await gradeService.generateReport(req.params.studentId, req.query.academicYear as string, req.query.term as string);
  sendSuccess(res, result);
}
