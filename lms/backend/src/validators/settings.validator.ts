import { z } from 'zod';

export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
  inApp: z.boolean(),
});

export const updateSettingsSchema = z.object({
  schoolName: z.string().min(1).max(200).optional(),
  schoolCode: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  academicYear: z.string().max(20).optional(),
  semester: z.string().max(50).optional(),
  gradingSystem: z
    .object({
      type: z.enum(['letter', 'percentage', 'gpa']),
      scale: z.number().positive(),
      passingGrade: z.string().max(5),
    })
    .optional(),
  attendanceSettings: z
    .object({
      enableGeoFencing: z.boolean(),
      gracePeriodMinutes: z.number().int().positive(),
      autoMarkAbsentAfter: z.number().int().positive(),
    })
    .optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
  securitySettings: z
    .object({
      passwordMinLength: z.number().int().min(6).max(64),
      maxLoginAttempts: z.number().int().positive(),
      sessionTimeoutMinutes: z.number().int().positive(),
      requireTwoFactor: z.boolean(),
    })
    .optional(),
  features: z
    .record(z.boolean())
    .optional(),
  customFields: z.record(z.unknown()).optional(),
});
