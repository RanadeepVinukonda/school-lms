import { Router } from 'express';
import { z } from 'zod';
import * as assignmentController from '../controllers/assignment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema } from '../validators/assignment.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/', authenticate, asyncHandler(assignmentController.listAllAssignments));
router.get('/course/:courseId', authenticate, asyncHandler(assignmentController.listAssignmentsByCourse));
router.get('/:assignmentId', authenticate, asyncHandler(assignmentController.getAssignment));
router.post('/', authenticate, requireRole('teacher', 'admin'), validate(createAssignmentSchema), asyncHandler(assignmentController.createAssignment));
router.put('/:assignmentId', authenticate, requireRole('teacher', 'admin'), validate(updateAssignmentSchema), asyncHandler(assignmentController.updateAssignment));
router.delete('/:assignmentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentController.deleteAssignment));
router.post('/:assignmentId/submit', authenticate, requireRole('student'), asyncHandler(assignmentController.submitAssignment));
router.get('/:assignmentId/submissions', authenticate, requireRole('teacher', 'admin'), asyncHandler(assignmentController.listSubmissions));
router.put('/:assignmentId/submissions/:submissionId/grade', authenticate, requireRole('teacher', 'admin'), validate(gradeSubmissionSchema), asyncHandler(assignmentController.gradeSubmission));

const aiGradeSchema = z.object({
  question: z.string().min(1),
  modelAnswer: z.string().optional(),
  rubric: z.string().optional(),
  answer: z.string().min(1),
  maxPoints: z.number().int().positive(),
});

const aiGradeBulkSchema = z.object({
  items: z.array(z.object({
    questionId: z.string().min(1),
    question: z.string().min(1),
    modelAnswer: z.string().optional(),
    rubric: z.string().optional(),
    answer: z.string().min(1),
    maxPoints: z.number().int().positive(),
  })).min(1).max(50),
});

const generateQuestionsSchema = z.object({
  conceptId: z.string().min(1),
  textbookId: z.string().optional(),
  chapterId: z.string().optional(),
  conceptName: z.string().optional(),
  types: z.array(z.string()).optional(),
  count: z.number().int().positive().max(50).default(5),
  difficulty: z.string().optional(),
});

router.post('/ai-grade', authenticate, requireRole('teacher', 'admin'), validate(aiGradeSchema), asyncHandler(assignmentController.aiGradeSingle));
router.post('/ai-grade-bulk', authenticate, requireRole('teacher', 'admin'), validate(aiGradeBulkSchema), asyncHandler(assignmentController.aiGradeBulkHandler));
router.post('/generate-questions', authenticate, requireRole('teacher', 'admin'), validate(generateQuestionsSchema), asyncHandler(assignmentController.generateQuestions));

export default router;
