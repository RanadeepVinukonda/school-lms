import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { sendSuccess, sendCreated } from '../utils/response';
import {
  getStudentRecommendations,
  createResourceRequest,
  listStudentRequests,
  listTeacherRequests,
  approveResourceRequest,
  declineResourceRequest,
  getStudentResources,
  searchResourcesForConcept,
} from '../services/resource-request.service';

const router = Router();

const createRequestSchema = z.object({
  conceptId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const approveSchema = z.object({
  resources: z.array(z.object({
    id: z.string().optional(),
    videoId: z.string().optional(),
    source: z.string().optional(),
    sourceLabel: z.string().optional(),
    title: z.string().min(1),
    thumbnail: z.string().optional(),
    duration: z.string().optional(),
    channelName: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    embedUrl: z.string().optional(),
    relevance: z.number().optional(),
  })).min(1),
});

const declineSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Student: recommended weak concepts from exams (mastery < 0.7) + request status
router.get('/recommendations', authenticate, requireRole('student'), asyncHandler(async (req, res) => {
  const items = await getStudentRecommendations(req.user!.uid);
  sendSuccess(res, items);
}));

// Student: create a request for curated resources on a concept
router.post('/requests', authenticate, requireRole('student'), validate(createRequestSchema), asyncHandler(async (req, res) => {
  const request = await createResourceRequest({
    studentId: req.user!.uid,
    conceptId: req.body.conceptId,
    reason: req.body.reason,
  });
  sendCreated(res, request, 'Resource request submitted');
}));

// Student: their own requests
router.get('/requests/mine', authenticate, requireRole('student'), asyncHandler(async (req, res) => {
  const items = await listStudentRequests(req.user!.uid);
  sendSuccess(res, items);
}));

// Student: their pushed resources, grouped by subject & concept
router.get('/resources/mine', authenticate, requireRole('student'), asyncHandler(async (req, res) => {
  const groups = await getStudentResources(req.user!.uid);
  sendSuccess(res, groups);
}));

// Teacher: pending requests
router.get('/requests', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
  const items = await listTeacherRequests(req.user!.uid, req.user!.school_id || null);
  sendSuccess(res, items);
}));

// Teacher: search candidate resources for a concept (to push)
router.get('/search/:conceptId', authenticate, requireRole('teacher'), asyncHandler(async (req, res) => {
  const maxResults = Math.min(10, Math.max(1, parseInt(req.query.max as string, 10) || 6));
  const items = await searchResourcesForConcept(req.params.conceptId, maxResults);
  sendSuccess(res, items);
}));

// Teacher: approve + push resources
router.post('/requests/:id/approve', authenticate, requireRole('teacher'), validate(approveSchema), asyncHandler(async (req, res) => {
  const request = await approveResourceRequest({
    requestId: req.params.id,
    teacherId: req.user!.uid,
    resources: req.body.resources,
  });
  sendSuccess(res, request, 'Resources pushed to student');
}));

// Teacher: decline
router.post('/requests/:id/decline', authenticate, requireRole('teacher'), validate(declineSchema), asyncHandler(async (req, res) => {
  const request = await declineResourceRequest({
    requestId: req.params.id,
    teacherId: req.user!.uid,
    reason: req.body.reason,
  });
  sendSuccess(res, request, 'Request declined');
}));

export default router;
