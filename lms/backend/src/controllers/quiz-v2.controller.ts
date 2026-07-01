import { Request, Response } from 'express';
import * as quizV2Service from '../services/quiz-v2.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createQuiz(req: Request, res: Response) {
  const result = await quizV2Service.createQuiz({ ...req.body, teacherId: req.user!.uid, schoolId: req.user!.school_id });
  sendCreated(res, result, 'Quiz created');
}

export async function updateQuiz(req: Request, res: Response) {
  const result = await quizV2Service.updateQuiz(req.params.quizId, req.user!.uid, req.body);
  sendSuccess(res, result, 'Quiz updated');
}

export async function releaseQuiz(req: Request, res: Response) {
  const result = await quizV2Service.releaseQuiz(req.params.quizId, req.user!.uid);
  sendSuccess(res, result, 'Quiz released');
}

export async function startAttempt(req: Request, res: Response) {
  const result = await quizV2Service.startQuizAttempt(
    req.params.quizId,
    req.user!.uid,
    req.body.selectedModels,
  );
  sendSuccess(res, result, 'Quiz attempt started');
}

export async function submitAttempt(req: Request, res: Response) {
  const result = await quizV2Service.submitQuizAttempt(
    req.params.attemptId,
    req.user!.uid,
    req.body,
  );
  sendSuccess(res, result, 'Quiz submitted');
}

export async function releaseGrades(req: Request, res: Response) {
  const { showResults } = req.body;
  const result = await quizV2Service.releaseQuizGrades(req.params.quizId, showResults);
  sendSuccess(res, result, `Grades ${showResults ? 'released' : 'withheld'}`);
}

export async function getResults(req: Request, res: Response) {
  const result = await quizV2Service.getQuizResults(req.params.quizId, req.user!.uid);
  sendSuccess(res, result);
}

export async function getQuizById(req: Request, res: Response) {
  const result = await quizV2Service.getQuizById(req.params.quizId);
  sendSuccess(res, result);
}

// Get quiz for a concept (first match)
export async function getQuizByConcept(req: Request, res: Response) {
  const result = await quizV2Service.getQuizForConcept(req.params.conceptId);
  sendSuccess(res, result);
}

export async function listForClass(req: Request, res: Response) {
  const result = await quizV2Service.listQuizzesForClass(req.params.classId, req.user!.school_id);
  sendSuccess(res, result);
}

export async function listForTeacher(req: Request, res: Response) {
  const result = await quizV2Service.listQuizzesForTeacher(req.user!.uid, req.user!.school_id);
  sendSuccess(res, result);
}

export async function republishQuiz(req: Request, res: Response) {
  const result = await quizV2Service.republishQuiz(req.params.quizId, req.user!.uid);
  sendSuccess(res, result, 'Quiz republished in interactive mode');
}

export async function deleteQuiz(req: Request, res: Response) {
  await quizV2Service.deleteQuiz(req.params.quizId, req.user!.uid);
  sendSuccess(res, null, 'Quiz deleted');
}

export async function getMyAttempts(req: Request, res: Response) {
  const result = await quizV2Service.getQuizAttemptsForStudent(req.user!.uid);
  sendSuccess(res, result);
}
