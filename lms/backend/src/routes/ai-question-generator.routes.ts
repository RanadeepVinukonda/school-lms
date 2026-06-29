import { Router } from 'express';
import * as ctrl from '../controllers/ai-question-generator.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.post('/generate', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.generateForConcept));
router.post('/generate-and-save', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.generateAndSave));
router.post('/from-textbook', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.generateFromTextbook));
router.post('/fill-missing', authenticate, requireRole('teacher', 'admin'), asyncHandler(ctrl.fillMissingTypes));

export default router;
