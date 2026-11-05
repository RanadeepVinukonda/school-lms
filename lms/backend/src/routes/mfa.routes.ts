import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { setupMfa, verifyMfa } from '../services/mfa.service';
import { AppError } from '../utils/errors';

const router = Router();

const verifySchema = z.object({
  token: z.string().length(6),
});

router.post('/setup', authenticate, asyncHandler(async (req, res) => {
  const result = await setupMfa(req.user!.uid);
  res.json({ success: true, data: result });
}));

router.post('/verify', authenticate, validate(verifySchema), asyncHandler(async (req, res) => {
  const ok = await verifyMfa(req.user!.uid, req.body.token);
  if (!ok) throw new AppError(400, 'Invalid MFA token');
  res.json({ success: true, message: 'MFA verified successfully' });
}));

export default router;
