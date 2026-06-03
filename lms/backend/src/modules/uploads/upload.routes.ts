import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { uploadRateLimit } from '../../middlewares/rateLimit.middleware';
import * as uploadController from './upload.controller';

const router = Router();

router.use(authenticate);

router.post('/single', uploadRateLimit, uploadController.uploadFile);
router.post('/multiple', uploadRateLimit, uploadController.uploadMultiple);
router.get('/:id/url', uploadController.getFileUrl);
router.delete('/:id', uploadController.deleteFile);
router.get('/mime-types', uploadController.getAllowedMimeTypes);

export default router;
