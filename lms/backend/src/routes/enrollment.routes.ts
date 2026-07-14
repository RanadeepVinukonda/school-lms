import { Router } from 'express';
import * as enrollmentController from '../controllers/enrollment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

// Get current user's enrollments and concept release statuses
router.get('/my', authenticate, asyncHandler(enrollmentController.getMyEnrollments));;

export default router;