import { Request, Response } from 'express';
import * as examService from '../services/exam.service';
import { requireNoDependenciesOrThrow, getExamImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReqWithUser, QueryParams } from '../types/common';

export async function listAllExams(req: Request, res: Response) {
  const result = await examService.listAllExams({
    ...(req.query as QueryParams),
    schoolId: req.user!.school_id,
  });
  sendSuccess(res, result);
}

export async function createExam(req: Request, res: Response) {
  const result = await examService.createExam({ ...req.body, schoolId: req.user!.school_id });
  logAudit(adminAuditEntry(req as ReqWithUser, 'exam.create', result.id, 'exam', result.title, {
    newValue: result,
    summary: `Created exam "${result.title}"`,
  }));
  sendCreated(res, result, 'Exam created');
}

export async function updateExam(req: Request, res: Response) {
  const old = await examService.getExamById(req.params.examId);
  const result = await examService.updateExam(req.params.examId, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'exam.update', req.params.examId, 'exam', old.title, {
    oldValue: old,
    newValue: result,
    summary: `Updated exam "${old.title}"`,
  }));
  sendSuccess(res, result, 'Exam updated');
}

export async function deleteExam(req: Request, res: Response) {
  const exam = await examService.getExamById(req.params.examId);
  await requireNoDependenciesOrThrow('exam', req.params.examId, getExamImpact);
  await examService.deleteExam(req.params.examId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'exam.delete', req.params.examId, 'exam', exam.title));
  sendSuccess(res, null, 'Exam deleted');
}

export async function getExam(req: Request, res: Response) {
  const result = await examService.getExamById(req.params.examId);
  sendSuccess(res, result);
}

export async function scheduleExam(req: Request, res: Response) {
  const result = await examService.scheduleExam(req.params.examId, req.body);
  sendSuccess(res, result, 'Exam scheduled');
}

export async function startExamAttempt(req: Request, res: Response) {
  const result = await examService.startExamAttempt(req.params.examId, req.user!.uid);
  sendSuccess(res, result, 'Exam attempt started');
}

export async function submitExamAttempt(req: Request, res: Response) {
  const result = await examService.submitExamAttempt(req.params.attemptId, req.user!.uid, req.body);
  sendSuccess(res, result, 'Exam submitted');
}

export async function gradeExamAttempt(req: Request, res: Response) {
  const result = await examService.gradeExamAttempt(req.params.attemptId, req.user!.uid, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'grade.update', req.params.attemptId, 'examAttempt', req.params.attemptId, {
    newValue: req.body,
    summary: `Graded exam attempt ${req.params.attemptId}`,
  }));
  sendSuccess(res, result, 'Exam attempt graded');
}

export async function getExamResults(req: Request, res: Response) {
  const result = await examService.getExamResults(req.params.examId, req.user!.uid);
  sendSuccess(res, result);
}

export async function releaseExamGrades(req: Request, res: Response) {
  const { gradesReleased } = req.body;
  const old = await examService.getExamById(req.params.examId);
  const result = await examService.releaseExamGrades(req.params.examId, gradesReleased);
  logAudit(adminAuditEntry(req as ReqWithUser, 'exam.update', req.params.examId, 'exam', old.title, {
    oldValue: { gradesReleased: old.gradesReleased },
    newValue: { gradesReleased },
    summary: `${gradesReleased ? 'Released' : 'Withheld'} grades for exam "${old.title}"`,
  }));
  sendSuccess(res, result, `Grades ${gradesReleased ? 'released' : 'withheld'}`);
}
