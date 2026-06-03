import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import * as activityController from './activity.controller';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin'), activityController.getActivityLogs);
router.get('/my', activityController.getMyActivity);

export default router;
