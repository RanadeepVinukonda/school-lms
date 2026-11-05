import { Request, Response } from 'express';
import * as unifiedTestEngineService from '../services/unified-test-engine.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { requireUser } from '../types/common';

export async function createTest(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.createTest({ ...req.body, teacherId: user.uid });
  sendCreated(res, result, 'Test created successfully');
}

export async function previewTest(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.createTest({ ...req.body, teacherId: user.uid, preview: true });
  sendSuccess(res, result, 'Preview generated');
}

export async function getTest(req: Request, res: Response) {
  const result = await unifiedTestEngineService.getTestById(req.params.testId);
  sendSuccess(res, result);
}

export async function updateTest(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.updateTest(req.params.testId, user.uid, req.body);
  sendSuccess(res, result, 'Test updated');
}

export async function deleteTest(req: Request, res: Response) {
  const user = requireUser(req);
  await unifiedTestEngineService.deleteTest(req.params.testId, user.uid);
  sendSuccess(res, null, 'Test deleted');
}

export async function listTestsForClass(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.getTestsForClass(req.params.classId, user.role);
  sendSuccess(res, result);
}

export async function listTestsForTeacher(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.getTestsForTeacher(user.uid);
  sendSuccess(res, result);
}

export async function republishTest(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.republishTest(req.params.testId, user.uid);
  sendSuccess(res, result, 'Test republished');
}

export async function startTestAttempt(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.startTestAttempt(req.params.testId, user.uid);
  sendSuccess(res, result, 'Attempt started');
}

export async function submitTestAttempt(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.submitTestAttempt(req.params.attemptId, user.uid, req.body);
  sendSuccess(res, result, 'Attempt submitted');
}

export async function getTestResults(req: Request, res: Response) {
  const user = requireUser(req);
  const isPrivileged = user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin';
  const result = await unifiedTestEngineService.getTestResults(req.params.testId, user.uid, isPrivileged);
  sendSuccess(res, result);
}

export async function releaseTestResults(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.releaseResults(req.params.testId, req.body.showResults, user.uid);
  sendSuccess(res, result, 'Results visibility updated');
}

export async function createTemplate(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.createTestTemplate({ ...req.body, teacherId: user.uid });
  sendCreated(res, result, 'Template created');
}

export async function updateTemplate(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.updateTestTemplate(req.params.templateId, user.uid, req.body);
  sendSuccess(res, result, 'Template updated');
}

export async function deleteTemplate(req: Request, res: Response) {
  const user = requireUser(req);
  await unifiedTestEngineService.deleteTestTemplate(req.params.templateId, user.uid);
  sendSuccess(res, null, 'Template deleted');
}

export async function listTemplates(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await unifiedTestEngineService.getTeacherTemplates(user.uid);
  sendSuccess(res, result);
}

export async function getStudentAttempts(req: Request, res: Response) {
  const user = requireUser(req);
  const studentId = req.params.studentId || user.uid;
  const result = await unifiedTestEngineService.getTestAttemptsForStudent(studentId);
  sendSuccess(res, result);
}

export async function getClassAttempts(req: Request, res: Response) {
  const result = await unifiedTestEngineService.getClassAttempts(req.params.classId);
  sendSuccess(res, result);
}
