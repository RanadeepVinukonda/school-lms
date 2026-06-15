import { Router } from 'express';
import * as codingController from '../controllers/coding.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/projects', authenticate, asyncHandler(codingController.getAllProjects));
router.post('/projects', authenticate, asyncHandler(codingController.createProject));
router.get('/projects/:id', authenticate, asyncHandler(codingController.getProjectById));
router.put('/projects/:id', authenticate, asyncHandler(codingController.updateProject));
router.delete('/projects/:id', authenticate, asyncHandler(codingController.deleteProject));
router.post('/execute', authenticate, asyncHandler(codingController.executeCode));
router.get('/stream-projects', authenticate, asyncHandler(codingController.getAllStreamProjects));
router.post('/stream-projects', authenticate, requireRole('teacher', 'admin'), asyncHandler(codingController.createStreamProject));
router.post('/stream-projects/:id/collaborate', authenticate, asyncHandler(codingController.addStreamCollaborator));

export default router;
