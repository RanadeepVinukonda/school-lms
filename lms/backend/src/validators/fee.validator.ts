import { z } from 'zod';

export const createFeeScheduleSchema = z.object({
  name: z.string().min(1, 'Name required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().min(1, 'Due date required'),
  classId: z.string().min(1, 'Class ID required'),
  academicYear: z.string().min(1, 'Academic year required'),
  description: z.string().max(1000).optional(),
});

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID required'),
  feeScheduleId: z.string().min(1, 'Fee schedule ID required'),
  amountPaid: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method required'),
  transactionId: z.string().optional(),
  status: z.string().optional(),
});
