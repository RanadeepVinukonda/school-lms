import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['teacher', 'non-teaching']),
  department: z.string().optional(),
  joining_date: z.string().optional(),
  contract_url: z.string().optional(),
  user_id: z.string().uuid().optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['teacher', 'non-teaching']).optional(),
  department: z.string().optional(),
  joining_date: z.string().optional(),
  contract_url: z.string().optional(),
  user_id: z.string().uuid().optional(),
});

export const markStaffAttendanceSchema = z.object({
  staff_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['present', 'absent', 'leave']),
});

export const staffAttendanceReportQuerySchema = z.object({
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
