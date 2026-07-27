import { Request, Response } from 'express';
import * as assignmentV2Service from '../services/assignment-v2.service';
import { logAudit, adminAuditEntry, type AuditAction } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ValidationError } from '../utils/errors';
import type { ReqWithUser, QueryParams } from '../types/common';

export async function createAssignment(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await assignmentV2Service.createAssignment({ ...req.body, schoolId: req.user.school_id }) as Record<string, unknown>;
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignmentV2.create' as AuditAction, result.id as string, 'assignmentV2', result.title as string, {
    newValue: result,
    summary: `Created assignment V2 "${result.title}"`,
  }));
  sendCreated(res, result, 'Assignment created');
}

export async function getAssignmentById(req: Request, res: Response) {
  const result = await assignmentV2Service.getAssignmentById(req.params.assignmentId);
  sendSuccess(res, result);
}

export async function releaseAssignment(req: Request, res: Response) {
  const old = await assignmentV2Service.getAssignmentById(req.params.assignmentId);
  const result = await assignmentV2Service.releaseAssignment(req.params.assignmentId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignmentV2.release' as AuditAction, req.params.assignmentId, 'assignmentV2', String((old as Record<string, unknown>)?.title ?? ''), {
    oldValue: { releasedAt: (old as Record<string, unknown>)?.releasedAt },
    newValue: { releasedAt: (result as Record<string, unknown>)?.releasedAt },
    summary: `Released assignment V2 "${String((old as Record<string, unknown>)?.title ?? '')}"`,
  }));
  sendSuccess(res, result, 'Assignment released');
}

export async function startAssignment(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await assignmentV2Service.startAssignment(req.params.assignmentId, req.user.uid);
  sendSuccess(res, result, 'Assignment started');
}

export async function submitAssignment(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await assignmentV2Service.submitAssignment(req.params.attemptId, req.user.uid, req.body);
  sendSuccess(res, result, 'Assignment submitted');
}

export async function releaseGrades(req: Request, res: Response) {
  const { showResults } = req.body;
  const old = await assignmentV2Service.getAssignmentById(req.params.assignmentId);
  const result = await assignmentV2Service.releaseAssignmentGrades(req.params.assignmentId, showResults);
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignmentV2.update' as AuditAction, req.params.assignmentId, 'assignmentV2', String((old as Record<string, unknown>)?.title ?? ''), {
    oldValue: { showResults: (old as Record<string, unknown>)?.showResults },
    newValue: { showResults },
    summary: `${showResults ? 'Released' : 'Withheld'} grades for assignment V2 "${String((old as Record<string, unknown>)?.title ?? '')}"`,
  }));
  sendSuccess(res, result, `Grades ${showResults ? 'released' : 'withheld'}`);
}

export async function getResults(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await assignmentV2Service.getResults(req.params.assignmentId, req.user.uid);
  sendSuccess(res, result);
}

export async function listForClass(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const studentId = req.user.role === 'student' ? req.user.uid : undefined;
  const result = await assignmentV2Service.listAssignmentsForClass(req.params.classId, studentId);
  sendSuccess(res, result);
}

export async function listForTeacher(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const result = await assignmentV2Service.listAssignmentsForTeacher(req.user.uid, {
    ...(req.query as QueryParams),
    schoolId: req.user.school_id,
  });
  sendSuccess(res, result);
}
