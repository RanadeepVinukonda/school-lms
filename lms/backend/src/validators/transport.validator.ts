import { z } from 'zod';

export const createRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  vehicle_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
});

export const updateRouteSchema = z.object({
  name: z.string().optional(),
  vehicle_number: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
});

export const createStopSchema = z.object({
  route_id: z.string().uuid(),
  name: z.string().min(1, 'Stop name is required'),
  pickup_time: z.string().optional(),
  drop_time: z.string().optional(),
  fare: z.number().optional(),
  sequence: z.number().optional(),
});

export const updateStopSchema = z.object({
  name: z.string().optional(),
  pickup_time: z.string().optional(),
  drop_time: z.string().optional(),
  fare: z.number().optional(),
  sequence: z.number().optional(),
});

export const assignStudentSchema = z.object({
  student_id: z.string().uuid(),
  route_id: z.string().uuid(),
  stop_id: z.string().uuid().optional(),
});

export const markAttendanceSchema = z.object({
  student_id: z.string().uuid(),
  route_id: z.string().uuid(),
  status: z.enum(['boarded', 'alighted', 'absent']),
  direction: z.enum(['morning', 'evening']),
});

export const attendanceQuerySchema = z.object({
  routeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  direction: z.enum(['morning', 'evening']),
});
