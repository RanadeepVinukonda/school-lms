import { Router } from 'express';
import { z } from 'zod';
import * as codingController from '../controllers/coding.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1),
  code: z.string().optional(),
}).passthrough();

const updateProjectSchema = z.object({
  title: z.string().optional(),
  code: z.string().optional(),
}).passthrough();

const executeCodeSchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
  input: z.string().optional(),
}).passthrough();

const addCollaboratorSchema = z.object({
  userId: z.string().min(1),
}).passthrough();

router.get('/projects', authenticate, asyncHandler(codingController.getAllProjects));
router.post('/projects', authenticate, validate(createProjectSchema), asyncHandler(codingController.createProject));
router.get('/projects/:id', authenticate, asyncHandler(codingController.getProjectById));
router.put('/projects/:id', authenticate, validate(updateProjectSchema), asyncHandler(codingController.updateProject));
router.delete('/projects/:id', authenticate, asyncHandler(codingController.deleteProject));
router.post('/execute', authenticate, validate(executeCodeSchema), asyncHandler(codingController.executeCode));
router.get('/stream-projects', authenticate, asyncHandler(codingController.getAllStreamProjects));
router.get('/stream-projects/:id', authenticate, asyncHandler(codingController.getStreamProjectById));
router.post('/stream-projects', authenticate, requireRole('teacher', 'admin'), validate(createProjectSchema), asyncHandler(codingController.createStreamProject));
router.put('/stream-projects/:id', authenticate, validate(updateProjectSchema), asyncHandler(codingController.updateStreamProject));
router.delete('/stream-projects/:id', authenticate, requireRole('teacher', 'admin'), asyncHandler(codingController.deleteStreamProject));
router.post('/stream-projects/:id/collaborate', authenticate, validate(addCollaboratorSchema), asyncHandler(codingController.addStreamCollaborator));
router.delete('/stream-projects/:id/collaborate/:userId', authenticate, asyncHandler(codingController.removeStreamCollaborator));

export default router;
