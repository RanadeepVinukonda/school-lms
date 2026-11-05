import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as nepQuestionsController from '../controllers/nep-questions.controller';
import {
  generateQuestionsSchema,
  saveQuestionsSchema,
  generateRubricSchema,
  saveRubricSchema,
  generateFeedbackSchema,
} from '../validators/nep-questions.validator';

const router = Router();

router.post('/generate', authenticate, requireRole('teacher'), validate(generateQuestionsSchema), asyncHandler(nepQuestionsController.generateQuestions));
router.post('/save', authenticate, requireRole('teacher'), validate(saveQuestionsSchema), asyncHandler(nepQuestionsController.saveQuestions));
router.get('/:conceptId', authenticate, asyncHandler(nepQuestionsController.getNEPQuestions));
router.post('/rubric/generate', authenticate, requireRole('teacher'), validate(generateRubricSchema), asyncHandler(nepQuestionsController.generateRubric));
router.get('/rubric/list', authenticate, asyncHandler(nepQuestionsController.getRubrics));
router.get('/rubric/:id', authenticate, asyncHandler(nepQuestionsController.getRubricById));
router.post('/rubric/save', authenticate, requireRole('teacher'), validate(saveRubricSchema), asyncHandler(nepQuestionsController.saveRubric));
router.post('/rubric/feedback', authenticate, requireRole('teacher'), validate(generateFeedbackSchema), asyncHandler(nepQuestionsController.generateFeedback));

export default router;
