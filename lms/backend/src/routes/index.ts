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
import auditRoutes from './audit.routes';
import conceptRoutes from './concept.routes';
import teacherClassSubjectRoutes from './teacher-class-subject.routes';
import textbookRoutes from './textbook.routes';
import quizV2Routes from './quiz-v2.routes';
import assignmentV2Routes from './assignment-v2.routes';
import examV2Routes from './exam-v2.routes';
import teacherVideoRoutes from './teacher-video.routes';
import analyticsV2Routes from './analytics-v2.routes';
import resultsPushRoutes from './results-push.routes';
import questionBankRoutes from './question-bank.routes';
import questionPaperRoutes from './question-paper.routes';
import testTemplateRoutes from './test-template.routes';
import testScheduleRoutes from './test-schedule.routes';
import academicYearRoutes from './academic-year.routes';
import enrollmentRoutes from './enrollment.routes';
import gamificationRoutes from './gamification.routes';
import parentRoutes from './parent.routes';
import mindmapRoutes from './mindmap.routes';
import attendanceRoutes from './attendance.routes';
import feeRoutes from './fee.routes';
import schoolAnalyticsRoutes from './school-analytics.routes';
import codingRoutes from './coding.routes';
import prePrimaryRoutes from './pre-primary.routes';
import nepQuestionsRoutes from './nep-questions.routes';
import ocrRoutes from './ocr.routes';
import cloudinaryRoutes from './cloudinary.routes';
import virtualLabsRoutes from './virtual-labs.routes';
import unifiedTestEngineRoutes from './unified-test-engine.routes';
import aiQuestionGeneratorRoutes from './ai-question-generator.routes';
import contentPublishingRoutes from './content-publishing.routes';
import conceptProgressRoutes from './concept-progress.routes';
import mfaRoutes from './mfa.routes';
import schoolsRoutes from './schools.routes';
import adaptiveRoutes from './adaptive.routes';
import curriculumRoutes from './curriculum.routes';
import aiTutorRoutes from './ai-tutor.routes';
import noticeRoutes from './notice.routes';
import deviceTokenRoutes from './device-token.routes';
import codingChallengeRoutes from './coding-challenge.routes';
import notificationPrefsRoutes from './notification-prefs.routes';
import curriculumPlanRoutes from './curriculum-plan.routes';
import reportsRoutes from './reports.routes';
import timetableRoutes from './timetable.routes';
import transportRoutes from './transport.routes';
import inventoryRoutes from './inventory.routes';
import staffRoutes from './staff.routes';
import leaveRoutes from './leave.routes';
import payrollRoutes from './payroll.routes';
import searchRoutes from './search.routes';
import classroomRoutes from './classroom.routes';
import ltiRoutes from './lti.routes';
import { metricsHandler } from '../middlewares/metrics.middleware';
 
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
router.use('/audit-logs', auditRoutes);
router.use('/whiteboard', conceptRoutes);
router.use('/teacher-class-subject', teacherClassSubjectRoutes);
router.use('/textbooks', textbookRoutes);
router.use('/quizzes-v2', quizV2Routes);
router.use('/assignments-v2', assignmentV2Routes);
router.use('/exams-v2', examV2Routes);
router.use('/teacher-videos', teacherVideoRoutes);
router.use('/analytics-v2', analyticsV2Routes);
router.use('/results-push', resultsPushRoutes);
router.use('/question-bank', questionBankRoutes);
router.use('/question-papers', questionPaperRoutes);
router.use('/test-templates', testTemplateRoutes);
router.use('/test-schedule', testScheduleRoutes);
router.use('/academic-years', academicYearRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/parent', parentRoutes);
router.use('/mindmaps', mindmapRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/fee', feeRoutes);
router.use('/school-analytics', schoolAnalyticsRoutes);
router.use('/pre-primary', prePrimaryRoutes);
router.use('/coding', codingRoutes);
router.use('/nep-questions', nepQuestionsRoutes);
router.use('/ocr', ocrRoutes);
router.use('/cloudinary', cloudinaryRoutes);
router.use('/virtual-labs', virtualLabsRoutes);
router.use('/unified-test-engine', unifiedTestEngineRoutes);
router.use('/ai-question-generator', aiQuestionGeneratorRoutes);
router.use('/content-publishing', contentPublishingRoutes);
router.use('/concept-progress', conceptProgressRoutes);
router.use('/mfa', mfaRoutes);
router.use('/schools', schoolsRoutes);
router.use('/adaptive', adaptiveRoutes);
router.use('/curriculum', curriculumRoutes);
router.use('/ai-tutor', aiTutorRoutes);
router.use('/fees', feeRoutes);
router.use('/notices', noticeRoutes);
router.use('/device-tokens', deviceTokenRoutes);
router.use('/coding-challenges', codingChallengeRoutes);
router.use('/notification-preferences', notificationPrefsRoutes);
router.use('/reports', reportsRoutes);
router.use('/timetable', timetableRoutes);
router.use('/transport', transportRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/staff', staffRoutes);
router.use('/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/search', searchRoutes);
router.use('/classroom', classroomRoutes);
router.use('/lti', ltiRoutes);
router.use('/', curriculumPlanRoutes);

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

router.get('/ready', async (_req, res) => {
  const { getSupabaseAdmin } = await import('../services/supabase');
  const supabase = getSupabaseAdmin();
  let dbOk = false;
  try {
    const { error } = await supabase!.from('users').select('id').limit(1);
    dbOk = !error;
  } catch { dbOk = false; }
  res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'degraded', database: dbOk });
});

router.get('/metrics', metricsHandler);

export default router;
