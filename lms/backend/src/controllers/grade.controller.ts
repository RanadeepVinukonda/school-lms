import { Request, Response } from 'express';
import * as gradeService from '../services/grade.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import type { ReqWithUser, QueryParams } from '../types/common';

export async function getStudentGrades(req: Request, res: Response) {
  const result = await gradeService.getStudentGrades(req.params.studentId, req.query.academicYear as string);
  sendSuccess(res, result);
}

export async function getGradebook(req: Request, res: Response) {
  const result = await gradeService.getGradebook(req.query as QueryParams);
  sendSuccess(res, result);
}

export async function updateGrade(req: Request, res: Response) {
  const result = await gradeService.updateGrade(req.params.gradeId, { ...req.body, gradedBy: req.user!.uid });
  logAudit(adminAuditEntry(req as ReqWithUser, 'grade.update', req.params.gradeId, 'grade', req.params.gradeId, {
    newValue: req.body,
    summary: `Updated grade ${req.params.gradeId}`,
  }));
  sendSuccess(res, result, 'Grade updated');
}

export async function bulkUpdateGrades(req: Request, res: Response) {
  const result = await gradeService.bulkUpdate(req.body.grades, req.params.courseId, req.user!.uid);
  logAudit(adminAuditEntry(req as ReqWithUser, 'grade.bulk', req.params.courseId, 'grade', req.params.courseId, {
    summary: `Bulk updated ${req.body.grades?.length || 0} grades for course ${req.params.courseId}`,
  }));
  sendSuccess(res, result, 'Grades updated');
}

export async function generateReport(req: Request, res: Response) {
  const result = await gradeService.generateReport(req.params.studentId, req.query.academicYear as string, req.query.term as string);
  sendSuccess(res, result);
}
