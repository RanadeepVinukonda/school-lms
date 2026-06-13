import { Request, Response } from 'express';
import * as assignmentService from '../services/assignment.service';
import { requireNoDependenciesOrThrow, getAssignmentImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import type { ReqWithUser, QueryParams } from '../types/common';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createAssignment(req: Request, res: Response) {
  const result = await assignmentService.createAssignment(req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignment.create', result.id, 'assignment', result.title, {
    newValue: result,
    summary: `Created assignment "${result.title}"`,
  }));
  sendCreated(res, result, 'Assignment created');
}

export async function updateAssignment(req: Request, res: Response) {
  const old = await assignmentService.getAssignmentById(req.params.assignmentId);
  const result = await assignmentService.updateAssignment(req.params.assignmentId, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignment.update', req.params.assignmentId, 'assignment', old.title, {
    oldValue: old,
    newValue: result,
    summary: `Updated assignment "${old.title}"`,
  }));
  sendSuccess(res, result, 'Assignment updated');
}

export async function deleteAssignment(req: Request, res: Response) {
  const assignment = await assignmentService.getAssignmentById(req.params.assignmentId);
  await requireNoDependenciesOrThrow('assignment', req.params.assignmentId, getAssignmentImpact);
  await assignmentService.deleteAssignment(req.params.assignmentId);
  logAudit(adminAuditEntry(req as ReqWithUser, 'assignment.delete', req.params.assignmentId, 'assignment', assignment.title));
  sendSuccess(res, null, 'Assignment deleted');
}

export async function getAssignment(req: Request, res: Response) {
  const result = await assignmentService.getAssignmentById(req.params.assignmentId);
  sendSuccess(res, result);
}

export async function listAllAssignments(req: Request, res: Response) {
  const result = await assignmentService.listAllAssignments(req.query as QueryParams);
  sendSuccess(res, result);
}

export async function listAssignmentsByCourse(req: Request, res: Response) {
  const result = await assignmentService.listAssignmentsByCourse(req.params.courseId, req.query as QueryParams);
  sendSuccess(res, result);
}

export async function submitAssignment(req: Request, res: Response) {
  const result = await assignmentService.submitAssignment(req.params.assignmentId, req.user!.uid, req.body);
  sendCreated(res, result, 'Assignment submitted');
}

export async function gradeSubmission(req: Request, res: Response) {
  const result = await assignmentService.gradeSubmission(req.params.submissionId, req.user!.uid, req.body);
  logAudit(adminAuditEntry(req as ReqWithUser, 'grade.update', req.params.submissionId, 'submission', req.params.submissionId, {
    newValue: req.body,
    summary: `Graded submission ${req.params.submissionId}: ${req.body.score}/${req.body.totalPoints}`,
  }));
  sendSuccess(res, result, 'Submission graded');
}

export async function listSubmissions(req: Request, res: Response) {
  const result = await assignmentService.listSubmissions(req.params.assignmentId, req.query as QueryParams);
  sendSuccess(res, result);
}
