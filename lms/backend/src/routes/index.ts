import { Router } from 'express';
import authRoutes from './auth.routes';
import courseRoutes from './course.routes';
import lessonRoutes from './lesson.routes';
import assignmentRoutes from './assignment.routes';
import quizRoutes from './quiz.routes';
import examRoutes from './exam.routes';
import gradeRoutes from './grade.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import userRoutes from './user.routes';
import classRoutes from './class.routes';
import subjectRoutes from './subject.routes';
import analyticsRoutes from './analytics.routes';
import uploadRoutes from './upload.routes';
import settingsRoutes from './settings.routes';
import aiRoutes from './ai.routes';
import jobsRoutes from './jobs.routes';
import youtubeRoutes from './youtube.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/lessons', lessonRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/quizzes', quizRoutes);
router.use('/exams', examRoutes);
router.use('/grades', gradeRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/subjects', subjectRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/upload', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai', aiRoutes);
router.use('/jobs', jobsRoutes);
router.use('/youtube', youtubeRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export default router;
