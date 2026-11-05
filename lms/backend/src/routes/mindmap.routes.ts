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

const generateMindMapSchema = z.object({
  text: z.string().min(10).max(10000),
  title: z.string().min(1).max(200),
  language: z.string().optional(),
}).passthrough();

const updateMindMapSchema = z.object({
  title: z.string().optional(),
  nodes: z.any().optional(),
  edges: z.any().optional(),
}).passthrough();

const shareMindMapSchema = z.object({
  shareWithIds: z.array(z.string()).min(1),
}).passthrough();

const pushToClassesSchema = z.object({
  classIds: z.array(z.string()).min(1),
  subjectId: z.string().optional(),
  subjectName: z.string().optional(),
}).passthrough();

const pinResourceSchema = z.object({
  nodeId: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.string().min(1),
}).passthrough();

const generateTextbookMindMapSchema = z.object({
  textbookId: z.string().min(1),
  language: z.string().optional(),
}).passthrough();

router.post('/generate', authenticate, validate(generateMindMapSchema), asyncHandler(mindmapController.generateMindMap));
router.post('/generate-textbook', authenticate, validate(generateTextbookMindMapSchema), asyncHandler(mindmapController.generateTextbookMindMap));
router.post('/', authenticate, validate(createMindMapSchema), asyncHandler(mindmapController.createMindMap));
router.get('/user', authenticate, asyncHandler(mindmapController.getUserMindMaps));
router.get('/shared', authenticate, asyncHandler(mindmapController.getSharedMindMaps));
router.get('/:id', authenticate, asyncHandler(mindmapController.getMindMap));
router.put('/:id', authenticate, validate(updateMindMapSchema), asyncHandler(mindmapController.updateMindMap));
router.delete('/:id', authenticate, asyncHandler(mindmapController.deleteMindMap));
router.delete('/:id/remove-share', authenticate, asyncHandler(mindmapController.removeSharedMindMap));
router.post('/:id/share', authenticate, validate(shareMindMapSchema), asyncHandler(mindmapController.shareMindMap));
router.post('/:id/push-to-classes', authenticate, validate(pushToClassesSchema), asyncHandler(mindmapController.pushMindMapToClasses));
router.post('/:id/pin-resource', authenticate, validate(pinResourceSchema), asyncHandler(mindmapController.pinResource));

export default router;
