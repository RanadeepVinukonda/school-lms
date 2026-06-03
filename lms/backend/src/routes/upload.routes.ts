import { Router } from 'express';
import { deleteUpload } from '../controllers/upload.controller';

const router = Router();
router.post('/delete', deleteUpload);

export default router;
