import { Router } from 'express';
import * as prePrimaryController from '../controllers/pre-primary.controller';

const router = Router();

router.get('/dashboard/:studentId', prePrimaryController.getDashboard);
router.get('/lessons', prePrimaryController.getLessons);
router.get('/flashcards/:subjectId', prePrimaryController.getFlashcards);
router.post('/tracing/save', prePrimaryController.saveTracing);
router.get('/stories', prePrimaryController.getStories);
router.post('/progress/:studentId', prePrimaryController.updateProgress);

export default router;
