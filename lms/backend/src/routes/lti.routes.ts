import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as ltiService from '../services/lti.service';

const router = Router();

router.post('/config', authenticate, requireRole('admin', 'super_admin'),
  validate(z.object({
    issuer: z.string().url(),
    client_id: z.string().min(1),
    deployment_id: z.string().min(1),
    auth_token_url: z.string().url(),
    auth_login_url: z.string().url(),
    jwks_url: z.string().url(),
  })),
  asyncHandler(async (req, res) => {
    const result = await ltiService.saveLtiConfig(req.user!.school_id || '', req.body);
    sendSuccess(res, result);
  })
);

router.get('/config', authenticate, requireRole('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const config = await ltiService.getLtiConfig(req.user!.school_id || '');
    sendSuccess(res, config);
  })
);

router.post('/launch',
  validate(z.object({
    id_token: z.string().min(1)
  })),
  asyncHandler(async (req, res) => {
    const result = await ltiService.handleLtiLaunch(req.body.id_token);
    
    // Redirect to frontend dashboard or coursework resource
    // For demo simplicity, we return success with launch payload and user
    sendSuccess(res, {
      message: 'LTI Launch successful',
      user: result.user,
      resourceLink: result.resourceLink,
      lineitem: result.lineitem
    });
  })
);

router.post('/grade', authenticate, requireRole('admin', 'super_admin', 'teacher'),
  validate(z.object({
    lineitemUrl: z.string().url(),
    userId: z.string().min(1),
    score: z.number().nonnegative(),
    maxScore: z.number().positive(),
  })),
  asyncHandler(async (req, res) => {
    const { lineitemUrl, userId, score, maxScore } = req.body;
    const result = await ltiService.passbackGrade(req.user!.school_id || '', lineitemUrl, userId, score, maxScore);
    sendSuccess(res, result);
  })
);

export default router;
