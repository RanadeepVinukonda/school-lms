import { Router } from 'express';
import uploadRoutes from '../upload.routes';
import aiRoutes from '../ai.routes';
import aiTutorRoutes from '../ai-tutor.routes';
import aiQuestionGeneratorRoutes from '../ai-question-generator.routes';
import ocrRoutes from '../ocr.routes';
import cloudinaryRoutes from '../cloudinary.routes';
import youtubeRoutes from '../youtube.routes';
import educationalVideoRoutes from '../educational-video.routes';
import contentPublishingRoutes from '../content-publishing.routes';
import searchRoutes from '../search.routes';
import deviceTokenRoutes from '../device-token.routes';
import notificationPrefsRoutes from '../notification-prefs.routes';
import teachResourcesRoutes from '../teach-resources.routes';

const router = Router();

router.use('/upload', uploadRoutes);
router.use('/ai', aiRoutes);
router.use('/ai-tutor', aiTutorRoutes);
router.use('/ai-question-generator', aiQuestionGeneratorRoutes);
router.use('/ocr', ocrRoutes);
router.use('/cloudinary', cloudinaryRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/educational-video', educationalVideoRoutes);
router.use('/content-publishing', contentPublishingRoutes);
router.use('/search', searchRoutes);
router.use('/device-tokens', deviceTokenRoutes);
router.use('/notification-preferences', notificationPrefsRoutes);
router.use('/teach-resources', teachResourcesRoutes);

export default router;
