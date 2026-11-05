import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as codingChallengeService from '../services/coding-challenge.service';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const items = await codingChallengeService.getChallenges(req.query.language as string, req.user!.school_id);
  sendSuccess(res, items);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const challenge = await codingChallengeService.getChallenge(req.params.id);
  sendSuccess(res, challenge);
}));

export default router;
