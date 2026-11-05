import { Request, Response } from 'express';
import * as aiQuestionGeneratorService from '../services/ai-question-generator.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function generateForConcept(req: Request, res: Response) {
  const { conceptId, textbookId, chapterId, conceptName, types, count, difficulty } = req.body;
  const questions = await aiQuestionGeneratorService.generateQuestionsForConcept({
    conceptId, textbookId, chapterId, conceptName, types, count, difficulty,
  });
  sendSuccess(res, { questions, count: questions.length }, 'Questions generated');
}

export async function generateAndSave(req: Request, res: Response) {
  const { conceptId, textbookId, chapterId, conceptName, types, count, difficulty } = req.body;
  const questions = await aiQuestionGeneratorService.generateQuestionsForConcept({
    conceptId, textbookId, chapterId, conceptName, types, count, difficulty,
  });

  if (questions.length > 0) {
    const saved = await aiQuestionGeneratorService.saveAiQuestions(questions, conceptId, textbookId, chapterId);
    sendCreated(res, { questions, savedCount: saved }, 'Questions generated and saved');
  } else {
    sendSuccess(res, { questions: [], savedCount: 0 }, 'No questions generated');
  }
}

export async function generateFromTextbook(req: Request, res: Response) {
  const { textbookId, chapterId, conceptId, types, totalCount } = req.body;
  const questions = await aiQuestionGeneratorService.generateQuestionsFromTextbook({
    textbookId, chapterId, conceptId, types, totalCount,
  });
  sendSuccess(res, { questions, count: questions.length }, 'Questions generated from textbook');
}

export async function fillMissingTypes(req: Request, res: Response) {
  const { conceptId, textbookId, chapterId, types, count } = req.body;
  const questions = await aiQuestionGeneratorService.generateQuestionsFromExistingBank({
    conceptId, textbookId, chapterId, types, count,
  });

  if (questions.length > 0) {
    const saved = await aiQuestionGeneratorService.saveAiQuestions(questions, conceptId, textbookId, chapterId);
    sendSuccess(res, { questions, savedCount: saved }, 'Missing type questions generated');
  } else {
    sendSuccess(res, { questions: [], savedCount: 0 }, 'No missing types to fill');
  }
}
