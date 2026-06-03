import { Request, Response } from 'express';
import * as examService from '../services/exam.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function listAllExams(req: Request, res: Response) {
  const result = await examService.listAllExams(req.query as any);
  sendSuccess(res, result);
}

export async function createExam(req: Request, res: Response) {
  const result = await examService.createExam(req.body);
  sendCreated(res, result, 'Exam created');
}

export async function updateExam(req: Request, res: Response) {
  const result = await examService.updateExam(req.params.examId, req.body);
  sendSuccess(res, result, 'Exam updated');
}

export async function deleteExam(req: Request, res: Response) {
  await examService.deleteExam(req.params.examId);
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
  sendSuccess(res, result, 'Exam attempt graded');
}

export async function getExamResults(req: Request, res: Response) {
  const result = await examService.getExamResults(req.params.examId, req.user!.uid);
  sendSuccess(res, result);
}
