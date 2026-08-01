import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { registerToken, getTokensForUser, deleteToken } from '../services/device-token.service';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tokens = await getTokensForUser(req.user!.uid);
  sendSuccess(res, tokens);
}));

router.post('/', authenticate,
  validate(z.object({ token: z.string(), platform: z.string().default('web') })),
  asyncHandler(async (req, res) => {
    // Auto-detect platform from token format
    let platform = req.body.platform;
    if (req.body.token.startsWith('ExponentPushToken[') || req.body.token.startsWith('expo_push_token[')) {
      platform = 'expo';
    }
    await registerToken(req.user!.uid, req.user!.school_id, req.body.token, platform);
    sendSuccess(res, null, 'Token registered');
  })
);

router.delete('/:token', authenticate, asyncHandler(async (req, res) => {
  await deleteToken(req.user!.uid, req.params.token);
  sendSuccess(res, null, 'Token deleted');
}));

export default router;
