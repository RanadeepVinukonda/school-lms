import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import * as questionBankController from '../controllers/question-bank.controller';

const router = Router();

router.post('/', authenticate, requireRole('teacher'), asyncHandler(questionBankController.createQuestion));
router.post('/bulk', authenticate, requireRole('teacher'), asyncHandler(questionBankController.bulkCreate));
router.post('/import-from-concept', authenticate, requireRole('teacher'), asyncHandler(questionBankController.importFromConcept));
router.get('/', authenticate, asyncHandler(questionBankController.listQuestions));
router.get('/:id', authenticate, asyncHandler(questionBankController.getQuestion));
router.put('/:id', authenticate, requireRole('teacher'), asyncHandler(questionBankController.updateQuestion));
router.delete('/:id', authenticate, requireRole('teacher'), asyncHandler(questionBankController.deleteQuestion));

export default router;
