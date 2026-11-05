import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const uuidSchema = z.string().uuid('Invalid UUID');

export const dateRangeSchema = z.object({
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});
