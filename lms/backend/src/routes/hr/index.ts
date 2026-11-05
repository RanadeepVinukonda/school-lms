import { Router } from 'express';
import staffRoutes from '../staff.routes';
import leaveRoutes from '../leave.routes';
import transportRoutes from '../transport.routes';
import inventoryRoutes from '../inventory.routes';

const router = Router();

router.use('/staff', staffRoutes);
router.use('/leaves', leaveRoutes);
router.use('/transport', transportRoutes);
router.use('/inventory', inventoryRoutes);

export default router;
