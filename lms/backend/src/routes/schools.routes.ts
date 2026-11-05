import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import * as schoolsController from '../controllers/schools.controller';

const router = Router();

const createSchoolSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().optional(),
  logo_url: z.string().optional(),
  primary_color: z.string().optional(),
  plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
});

const updateBrandingSchema = z.object({
  logo_url: z.string().optional(),
  primary_color: z.string().optional(),
});

router.post('/', authenticate, requireRole('super_admin'), validate(createSchoolSchema), asyncHandler(schoolsController.createSchool));
router.get('/:id', authenticate, asyncHandler(schoolsController.getSchool));
router.put('/:id', authenticate, requireRole('super_admin', 'admin'),
  validate(z.object({
    name: z.string().min(1).optional(),
    subdomain: z.string().optional(),
    logo_url: z.string().optional(),
    primary_color: z.string().optional(),
    plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  })),
  asyncHandler(schoolsController.updateSchool));
router.get('/:id/branding', authenticate, asyncHandler(schoolsController.getBranding));
router.put('/:id/branding', authenticate, requireRole('super_admin', 'admin'), validate(updateBrandingSchema), asyncHandler(schoolsController.updateBranding));

export default router;
