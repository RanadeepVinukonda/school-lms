import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getCurriculum, getBoards } from '../services/curriculum.service';

const router = Router();

const curriculumQuerySchema = z.object({
  board: z.string().min(1),
  grade: z.string().min(1),
  subject: z.string().min(1),
});

router.get('/', authenticate, validate(curriculumQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const items = await getCurriculum(req.query.board as string, req.query.grade as string, req.query.subject as string);
  sendSuccess(res, items);
}));

router.get('/boards', authenticate, asyncHandler(async (_req, res) => {
  const items = await getBoards();
  sendSuccess(res, items);
}));

export default router;
