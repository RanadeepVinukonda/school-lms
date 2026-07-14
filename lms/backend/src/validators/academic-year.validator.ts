import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();
