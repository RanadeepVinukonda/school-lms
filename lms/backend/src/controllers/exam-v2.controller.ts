import { Request, Response } from 'express';
import * as examV2Service from '../services/exam-v2.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createExam(req: Request, res: Response) {
  const result = await examV2Service.createExam({ ...req.body, teacherId: req.user!.uid });
  sendCreated(res, result, 'Exam created');
}

export async function releaseExam(req: Request, res: Response) {
  const result = await examV2Service.releaseExam(req.params.examId, req.user!.uid);
  sendSuccess(res, result, 'Exam released');
}

export async function startAttempt(req: Request, res: Response) {
  const result = await examV2Service.startExamAttempt(
    req.params.examId,
    req.user!.uid,
    req.body.selectedModels || [],
  );
  sendSuccess(res, result, 'Exam attempt started');
}

export async function submitAttempt(req: Request, res: Response) {
  const result = await examV2Service.submitExamAttempt(
    req.params.attemptId,
    req.user!.uid,
    req.body,
  );
  sendSuccess(res, result, 'Exam submitted');
}

export async function releaseGrades(req: Request, res: Response) {
  const { showResults } = req.body;
  const result = await examV2Service.releaseExamGrades(req.params.examId, showResults);
  sendSuccess(res, result, `Grades ${showResults ? 'released' : 'withheld'}`);
}

export async function getResults(req: Request, res: Response) {
  const result = await examV2Service.getExamResults(req.params.examId, req.user!.uid);
  sendSuccess(res, result);
}

export async function listForClass(req: Request, res: Response) {
  const result = await examV2Service.listExamsForClass(req.params.classId);
  sendSuccess(res, result);
}

export async function listForTeacher(req: Request, res: Response) {
  const result = await examV2Service.listExamsForTeacher(req.user!.uid);
  sendSuccess(res, result);
}

export async function logProctoringEvent(req: Request, res: Response) {
  let eventData = req.body;
  if (typeof eventData === 'string') {
    try {
      eventData = JSON.parse(eventData);
    } catch {
      // ignore
    }
  }
  const result = await examV2Service.logProctoringEvent(
    req.params.attemptId,
    req.user!.uid,
    eventData
  );
  sendSuccess(res, result, 'Proctoring event logged');
}

export async function getExam(req: Request, res: Response) {
  const result = await examV2Service.getExamById(req.params.examId);
  sendSuccess(res, result);
}

export async function getStudentAttempt(req: Request, res: Response) {
  const result = await examV2Service.getStudentAttempt(req.params.examId, req.params.studentId);
  sendSuccess(res, result);
}

export async function getProctoringLogs(req: Request, res: Response) {
  const result = await examV2Service.getProctoringLogs(req.params.attemptId);
  sendSuccess(res, result);
}
