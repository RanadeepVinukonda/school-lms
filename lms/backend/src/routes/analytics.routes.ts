import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as analyticsController from '../controllers/analytics.controller';
import * as analyticsService from '../services/analytics.service';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { validate } from '../middlewares/validate.middleware';
import { createNotification } from '../services/notification.service';
import { sendSuccess } from '../utils/response';

const router = Router();

const reTeachSchema = z.object({
  teacherId: z.string().min(1),
  className: z.string().min(1),
  subjectName: z.string().min(1),
  conceptName: z.string().min(1),
  section: z.string().optional(),
  affectedStudents: z.number().optional(),
  averageScore: z.number().optional(),
  suggestedReason: z.string().optional(),
}).passthrough();

// v1 routes
router.get('/student/dashboard', authenticate, requireRole('student', 'parent'), asyncHandler(analyticsController.getStudentDashboard));
router.get('/teacher/dashboard', authenticate, requireRole('teacher'), asyncHandler(analyticsController.getTeacherDashboard));
router.get('/admin/dashboard', authenticate, requireRole('admin'), asyncHandler(analyticsController.getAdminDashboard));
router.get('/course/:courseId', authenticate, requireRole('teacher', 'admin'), asyncHandler(analyticsController.getCourseAnalytics));

// v2 routes (consolidated)
router.get('/oversight', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (_req: Request, res: Response) => {
  const result = await analyticsService.getConceptOversight();
  sendSuccess(res, result);
}));
router.post('/re-teach', authenticate, requireRole('teacher', 'admin'), validate(reTeachSchema), asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, className, subjectName, conceptName, section, affectedStudents, averageScore, suggestedReason } = req.body;
  const sectionText = section ? ` (${section})` : '';
  const affectedText = affectedStudents != null ? `\nAffected Students: ${affectedStudents}` : '';
  const scoreText = averageScore != null ? `\nAverage Score: ${averageScore}%` : '';
  const reasonText = suggestedReason ? `\nSuggested Reason: ${suggestedReason}` : '';
  await createNotification({
    userId: teacherId,
    type: 're_teach',
    title: 'Action Required: Re-teach Concept',
    body: `The administrator has requested that you re-teach the concept "${conceptName}" in "${className}"${sectionText} for the subject "${subjectName}".${affectedText}${scoreText}${reasonText}`,
    priority: 'high',
    schoolId: req.user!.school_id,
  });
  sendSuccess(res, null, 'Teacher notified to re-teach concept');
}));
router.get('/conducted-tests', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (_req: Request, res: Response) => {
  const result = await analyticsService.getConductedTests();
  sendSuccess(res, result);
}));
router.get('/class/:classId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getClassPerformance(req.params.classId);
  sendSuccess(res, result);
}));
router.get('/class/:classId/concepts', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getConceptsForClass(req.params.classId);
  sendSuccess(res, result);
}));
router.get('/student/:studentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getStudentPerformance(req.params.studentId);
  sendSuccess(res, result);
}));
router.get('/assessment/:assessmentId', authenticate, requireRole('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  if (!type || !['quiz', 'assignment', 'exam'].includes(type as string)) {
    res.status(400).json({ success: false, message: 'type query param must be quiz, assignment, or exam' });
    return;
  }
  const result = await analyticsService.getAssessmentAnalytics(req.params.assessmentId, type as 'quiz' | 'assignment' | 'exam');
  sendSuccess(res, result);
}));

export default router;
