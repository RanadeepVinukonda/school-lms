import { Request, Response } from 'express';
import * as assignmentService from '../services/assignment.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createAssignment(req: Request, res: Response) {
  const result = await assignmentService.createAssignment(req.body);
  sendCreated(res, result, 'Assignment created');
}

export async function updateAssignment(req: Request, res: Response) {
  const result = await assignmentService.updateAssignment(req.params.assignmentId, req.body);
  sendSuccess(res, result, 'Assignment updated');
}

export async function deleteAssignment(req: Request, res: Response) {
  await assignmentService.deleteAssignment(req.params.assignmentId);
  sendSuccess(res, null, 'Assignment deleted');
}

export async function getAssignment(req: Request, res: Response) {
  const result = await assignmentService.getAssignmentById(req.params.assignmentId);
  sendSuccess(res, result);
}

export async function listAllAssignments(req: Request, res: Response) {
  const result = await assignmentService.listAllAssignments(req.query as any);
  sendSuccess(res, result);
}

export async function listAssignmentsByCourse(req: Request, res: Response) {
  const result = await assignmentService.listAssignmentsByCourse(req.params.courseId, req.query as any);
  sendSuccess(res, result);
}

export async function submitAssignment(req: Request, res: Response) {
  const result = await assignmentService.submitAssignment(req.params.assignmentId, req.user!.uid, req.body);
  sendCreated(res, result, 'Assignment submitted');
}

export async function gradeSubmission(req: Request, res: Response) {
  const result = await assignmentService.gradeSubmission(req.params.submissionId, req.user!.uid, req.body);
  sendSuccess(res, result, 'Submission graded');
}

export async function listSubmissions(req: Request, res: Response) {
  const result = await assignmentService.listSubmissions(req.params.assignmentId, req.query as any);
  sendSuccess(res, result);
}
