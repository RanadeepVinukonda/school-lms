import { Request, Response } from 'express';
import * as nepQuestionsService from '../services/nep-questions.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { ValidationError } from '../utils/errors';

export async function generateQuestions(req: Request, res: Response) {
  const { conceptId, conceptName, subject, types, difficulty, count } = req.body;
  const questions = await nepQuestionsService.generateQuestions({ conceptId, conceptName, subject, types, difficulty, count });
  sendSuccess(res, { questions }, `${questions.length} questions generated`);
}

export async function getNEPQuestions(req: Request, res: Response) {
  const { conceptId } = req.params;
  const questions = await nepQuestionsService.getNEPQuestions(conceptId);
  sendSuccess(res, questions);
}

export async function saveQuestions(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { conceptId, questions } = req.body;
  const saved = await nepQuestionsService.saveQuestions(conceptId, questions, req.user.uid);
  sendCreated(res, saved, `${saved.length} questions saved to concept bank`);
}

export async function generateRubric(req: Request, res: Response) {
  const { title, description, totalMarks, numCriteria } = req.body;
  const rubric = await nepQuestionsService.generateRubric({ title, description, totalMarks, numCriteria });
  sendSuccess(res, rubric, 'Rubric generated');
}

export async function saveRubric(req: Request, res: Response) {
  if (!req.user) throw new ValidationError('Authentication required');
  const { assignmentId, title, criteria, totalMarks } = req.body;
  const rubric = await nepQuestionsService.saveRubric({ assignmentId, title, criteria, totalMarks, userId: req.user.uid });
  sendCreated(res, rubric, 'Rubric saved');
}

export async function getRubrics(req: Request, res: Response) {
  const { assignmentId } = req.query;
  const rubrics = await nepQuestionsService.getRubrics(assignmentId as string | undefined);
  sendSuccess(res, rubrics);
}

export async function getRubricById(req: Request, res: Response) {
  const { id } = req.params;
  const rubric = await nepQuestionsService.getRubricById(id);
  sendSuccess(res, rubric);
}

export async function generateFeedback(req: Request, res: Response) {
  const { studentAnswer, rubric } = req.body;
  const feedback = await nepQuestionsService.generateFeedback({ studentAnswer, rubric });
  sendSuccess(res, feedback, 'Feedback generated');
}
