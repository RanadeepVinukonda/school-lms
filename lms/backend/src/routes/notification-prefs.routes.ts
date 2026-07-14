import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getPreferences, updatePreference } from '../services/notification-prefs.service';

const router = Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const prefs = await getPreferences(req.user!.uid);
  sendSuccess(res, prefs);
}));

router.put('/', authenticate, validate(z.object({
  category: z.string(),
  push_enabled: z.boolean(),
  in_app_enabled: z.boolean(),
})), asyncHandler(async (req, res) => {
  await updatePreference(req.user!.uid, req.body.category, req.body.push_enabled, req.body.in_app_enabled);
  sendSuccess(res, null, 'Preference updated');
}));

export default router;
