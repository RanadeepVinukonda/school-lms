import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import * as mindmapController from '../controllers/mindmap.controller';

const router = Router();

const createMindMapSchema = z.object({
  title: z.string().min(1),
  nodes: z.any().optional(),
  edges: z.any().optional(),
}).passthrough();

const updateMindMapSchema = z.object({
  title: z.string().optional(),
  nodes: z.any().optional(),
  edges: z.any().optional(),
}).passthrough();

const shareMindMapSchema = z.object({
  userId: z.string().min(1),
  permission: z.enum(['view', 'edit']).optional(),
}).passthrough();

const pinResourceSchema = z.object({
  resourceId: z.string().min(1),
  resourceType: z.string().min(1),
}).passthrough();

router.post('/', authenticate, validate(createMindMapSchema), asyncHandler(mindmapController.createMindMap));
router.get('/user', authenticate, asyncHandler(mindmapController.getUserMindMaps));
router.get('/shared', authenticate, asyncHandler(mindmapController.getSharedMindMaps));
router.get('/:id', authenticate, asyncHandler(mindmapController.getMindMap));
router.put('/:id', authenticate, validate(updateMindMapSchema), asyncHandler(mindmapController.updateMindMap));
router.delete('/:id', authenticate, asyncHandler(mindmapController.deleteMindMap));
router.post('/:id/share', authenticate, validate(shareMindMapSchema), asyncHandler(mindmapController.shareMindMap));
router.post('/:id/pin-resource', authenticate, validate(pinResourceSchema), asyncHandler(mindmapController.pinResource));

export default router;
