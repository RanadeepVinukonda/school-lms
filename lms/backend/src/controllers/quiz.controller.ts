import { Request, Response } from 'express';
import * as quizService from '../services/quiz.service';
import { requireNoDependenciesOrThrow, getQuizImpact } from '../services/impact.service';
import { logAudit, adminAuditEntry } from '../services/audit.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function listAllQuizzes(req: Request, res: Response) {
  const result = await quizService.listAllQuizzes(req.query as any);
  sendSuccess(res, result);
}

export async function createQuiz(req: Request, res: Response) {
  const result = await quizService.createQuiz(req.body);
  logAudit(adminAuditEntry(req as any, 'quiz.create', result.id, 'quiz', result.title, {
    newValue: result,
    summary: `Created quiz "${result.title}"`,
  }));
  sendCreated(res, result, 'Quiz created');
}

export async function updateQuiz(req: Request, res: Response) {
  const old = await quizService.getQuizById(req.params.quizId);
  const result = await quizService.updateQuiz(req.params.quizId, req.body);
  logAudit(adminAuditEntry(req as any, 'quiz.update', req.params.quizId, 'quiz', old.title, {
    oldValue: old,
    newValue: result,
    summary: `Updated quiz "${old.title}"`,
  }));
  sendSuccess(res, result, 'Quiz updated');
}

export async function deleteQuiz(req: Request, res: Response) {
  const quiz = await quizService.getQuizById(req.params.quizId);
  await requireNoDependenciesOrThrow('quiz', req.params.quizId, getQuizImpact);
  await quizService.deleteQuiz(req.params.quizId);
  logAudit(adminAuditEntry(req as any, 'quiz.delete', req.params.quizId, 'quiz', quiz.title));
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

export async function releaseGrades(req: Request, res: Response) {
  const { showResults } = req.body;
  const old = await quizService.getQuizById(req.params.quizId);
  const result = await quizService.releaseQuizGrades(req.params.quizId, showResults);
  logAudit(adminAuditEntry(req as any, 'quiz.update', req.params.quizId, 'quiz', old.title, {
    oldValue: { showResults: old.showResults },
    newValue: { showResults },
    summary: `${showResults ? 'Released' : 'Withheld'} grades for quiz "${old.title}"`,
  }));
  sendSuccess(res, result, `Grades ${showResults ? 'released' : 'withheld'}`);
}
