import { z } from 'zod';

export const markAttendanceSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'At least one student required'),
  classId: z.string().min(1, 'Class ID required'),
  date: z.string().min(1, 'Date required'),
  status: z.enum(['present', 'absent', 'late', 'holiday']),
  markedBy: z.string().min(1, 'Marked by required'),
  note: z.string().max(500).optional(),
});
