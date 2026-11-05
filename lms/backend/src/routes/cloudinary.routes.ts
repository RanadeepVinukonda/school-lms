import { Router } from 'express';
import * as cloudinaryController from '../controllers/cloudinary.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/signature', authenticate, asyncHandler(cloudinaryController.getUploadSignature));

export default router;
