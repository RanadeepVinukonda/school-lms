import { Router } from 'express';
import authRoutes from '../auth.routes';
import mfaRoutes from '../mfa.routes';
import userRoutes from '../user.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/mfa', mfaRoutes);
router.use('/users', userRoutes);

export default router;
