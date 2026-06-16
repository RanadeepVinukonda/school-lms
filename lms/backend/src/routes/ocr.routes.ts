import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { uploadRateLimit } from '../middlewares/rateLimit.middleware';
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

router.post('/scan', authenticate, uploadRateLimit, upload.single('image'), asyncHandler(ocrController.scanImage));

router.post('/scan-multiple', authenticate, uploadRateLimit, upload.array('images', 10), asyncHandler(ocrController.scanMultipleImages));

router.post('/map-to-concept', authenticate, asyncHandler(ocrController.mapToConcept));

router.get('/concepts/:textbookId', authenticate, asyncHandler(ocrController.getConceptsForTextbook));

export default router;
