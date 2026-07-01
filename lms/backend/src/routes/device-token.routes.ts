import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { registerToken } from '../services/device-token.service';

const router = Router();

router.post('/', authenticate,
  validate(z.object({ token: z.string(), platform: z.string().default('web') })),
  asyncHandler(async (req, res) => {
    await registerToken(req.user!.uid, req.user!.school_id, req.body.token, req.body.platform);
    sendSuccess(res, null, 'Token registered');
  })
);

export default router;
