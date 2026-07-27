import { Router } from 'express';
import authRoutes from './auth';
import schoolRoutes from './school';
import financeRoutes from './finance';
import academicsRoutes from './academics';
import hrRoutes from './hr';
import contentRoutes from './content';
import infrastructureRoutes from './infrastructure';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', schoolRoutes);
router.use('/', financeRoutes);
router.use('/', academicsRoutes);
router.use('/', hrRoutes);
router.use('/', contentRoutes);
router.use('/', infrastructureRoutes);

export default router;
