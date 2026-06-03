import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message must be at most 10000 characters'),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().url(),
        type: z.string(),
        size: z.number().int().positive(),
      })
    )
    .optional(),
  parentMessageId: z.string().optional(),
});

export const createConversationSchema = z.object({
  participants: z
    .array(z.string().min(1))
    .min(2, 'At least 2 participants required')
    .max(50, 'Maximum 50 participants'),
  title: z.string().max(200).optional(),
  type: z.enum(['direct', 'group', 'class', 'course']).default('direct'),
  metadata: z
    .object({
      classId: z.string().optional(),
      courseId: z.string().optional(),
    })
    .optional(),
});

export const conversationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const messageQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});
