import { Request, Response } from 'express';
import * as quizService from '../services/quiz.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createQuiz(req: Request, res: Response) {
  const result = await quizService.createQuiz(req.body);
  sendCreated(res, result, 'Quiz created');
}

export async function updateQuiz(req: Request, res: Response) {
  const result = await quizService.updateQuiz(req.params.quizId, req.body);
  sendSuccess(res, result, 'Quiz updated');
}

export async function deleteQuiz(req: Request, res: Response) {
  await quizService.deleteQuiz(req.params.quizId);
  sendSuccess(res, null, 'Quiz deleted');
}

export async function getQuiz(req: Request, res: Response) {
  const result = await quizService.getQuizById(req.params.quizId);
  sendSuccess(res, result);
}

export async function startAttempt(req: Request, res: Response) {
  const result = await quizService.startAttempt(req.params.quizId, req.user!.uid);
  sendSuccess(res, result, 'Quiz attempt started');
}

export async function submitAttempt(req: Request, res: Response) {
  const result = await quizService.submitAttempt(req.params.attemptId, req.user!.uid, req.body);
  sendSuccess(res, result, 'Quiz submitted');
}

export async function getResults(req: Request, res: Response) {
  const result = await quizService.getQuizResults(req.params.quizId, req.user!.uid);
  sendSuccess(res, result);
}
