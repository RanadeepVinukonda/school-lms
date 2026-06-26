import { Router } from 'express';
import * as prePrimaryController from '../controllers/pre-primary.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard/:studentId', prePrimaryController.getDashboard);
router.get('/lessons', prePrimaryController.getLessons);
router.get('/flashcards/:subjectId', prePrimaryController.getFlashcards);
router.post('/tracing/save', prePrimaryController.saveTracing);
router.get('/stories', prePrimaryController.getStories);
router.post('/progress/:studentId', prePrimaryController.updateProgress);

export default router;
