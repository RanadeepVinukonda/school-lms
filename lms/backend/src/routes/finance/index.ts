import { Router } from 'express';
import feeRoutes from '../fee.routes';
import payrollRoutes from '../payroll.routes';

const router = Router();

router.use('/fee', feeRoutes);
router.use('/payroll', payrollRoutes);

export default router;
