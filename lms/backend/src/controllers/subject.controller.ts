import { Request, Response } from 'express';
import * as subjectService from '../services/subject.service';
import { requireNoDependenciesOrThrow, getSubjectImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createSubject(req: Request, res: Response) {
  const result = await subjectService.createSubject(req.body);
  logAudit(adminAuditEntry(req as any, 'subject.create', result.id, 'subject', result.name, {
    newValue: result,
    summary: `Created subject "${result.name}" (${result.code})`,
  }));
  sendCreated(res, result, 'Subject created');
}

export async function updateSubject(req: Request, res: Response) {
  const old = await subjectService.getSubjectById(req.params.subjectId);
  const result = await subjectService.updateSubject(req.params.subjectId, req.body);
  logAudit(adminAuditEntry(req as any, 'subject.update', req.params.subjectId, 'subject', old.name, {
    oldValue: old,
    newValue: result,
    summary: `Updated subject "${old.name}"`,
  }));
  sendSuccess(res, result, 'Subject updated');
}

export async function deleteSubject(req: Request, res: Response) {
  const subject = await subjectService.getSubjectById(req.params.subjectId);
  await requireNoDependenciesOrThrow('subject', req.params.subjectId, getSubjectImpact);
  await subjectService.deleteSubject(req.params.subjectId);
  logAudit(adminAuditEntry(req as any, 'subject.delete', req.params.subjectId, 'subject', subject.name));
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
