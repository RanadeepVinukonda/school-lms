import { Router } from 'express';
import { deleteUpload } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.post('/delete', deleteUpload);

export default router;
