import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import * as mindmapController from '../controllers/mindmap.controller';

const router = Router();

router.post('/', authenticate, asyncHandler(mindmapController.createMindMap));
router.get('/user', authenticate, asyncHandler(mindmapController.getUserMindMaps));
router.get('/shared', authenticate, asyncHandler(mindmapController.getSharedMindMaps));
router.get('/:id', authenticate, asyncHandler(mindmapController.getMindMap));
router.put('/:id', authenticate, asyncHandler(mindmapController.updateMindMap));
router.delete('/:id', authenticate, asyncHandler(mindmapController.deleteMindMap));
router.post('/:id/share', authenticate, asyncHandler(mindmapController.shareMindMap));
router.post('/:id/pin-resource', authenticate, asyncHandler(mindmapController.pinResource));

export default router;
