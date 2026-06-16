import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticate } from '../middlewares/auth.middleware';
import { strictRateLimit } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { z } from 'zod';
import * as aiController from '../controllers/ai.controller';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

const router = Router();

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().positive().optional(),
});

router.post('/chat', authenticate, strictRateLimit, validate(chatSchema), asyncHandler(aiController.chat));

router.get('/diagnose', authenticate, asyncHandler(async (_req, res) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.AI_API_KEY}`,
  };
  if (env.AI_BASE_URL.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://school-lms-nine-phi.vercel.app';
    headers['X-Title'] = 'School LMS';
  }
  const payload = {
    model: env.AI_MODEL,
    messages: [{ role: 'user', content: 'reply exactly: "OK"' }],
    max_tokens: 10,
  };
  const start = Date.now();
  const resp = await fetch(env.AI_BASE_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
  const elapsed = Date.now() - start;
  const body = await resp.text();
  const endpoint = env.AI_BASE_URL.replace(/\/?(chat\/completions)?$/, '/chat/completions');
  sendSuccess(res, {
    endpoint,
    model: env.AI_MODEL,
    status: resp.status,
    elapsed,
    bodyPreview: body.slice(0, 1000),
  });
}));

export default router;
