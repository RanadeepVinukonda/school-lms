import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadRateLimit } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as ocrController from '../controllers/ocr.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const pushQuizSchema = z.object({
  classId: z.string().min(1),
  questions: z.array(z.any()),
}).passthrough();

const pushAssignmentSchema = z.object({
  classId: z.string().min(1),
  title: z.string().min(1),
}).passthrough();

const mapToConceptSchema = z.object({
  textbookId: z.string().min(1),
  conceptId: z.string().min(1),
  pageRange: z.string().optional(),
}).passthrough();

router.post('/scan', authenticate, uploadRateLimit, upload.single('image'), asyncHandler(ocrController.scanImage));

router.post('/scan-multiple', authenticate, uploadRateLimit, upload.array('images', 10), asyncHandler(ocrController.scanMultipleImages));

router.post('/chat', authenticate, upload.array('images', 10), asyncHandler(ocrController.chat));

router.post('/push-quiz', authenticate, requireRole('admin', 'teacher'), validate(pushQuizSchema), asyncHandler(ocrController.pushQuiz));

router.post('/push-assignment', authenticate, requireRole('admin', 'teacher'), validate(pushAssignmentSchema), asyncHandler(ocrController.pushAssignment));

router.post('/map-to-concept', authenticate, validate(mapToConceptSchema), asyncHandler(ocrController.mapToConcept));

router.get('/concepts/:textbookId', authenticate, asyncHandler(ocrController.getConceptsForTextbook));

export default router;
