import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { sendSuccess } from '../utils/response';
import { logger } from '../utils/logger';
import { saveMessage, getSession } from '../services/ai-tutor.service';
import { getSupabaseAdmin } from '../services/supabase';
import { chatCompletion } from '../services/ai.service';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conceptId: z.string().optional(),
  language: z.string().optional(),
});

async function getConceptContext(conceptId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return '';
  const { data: concept } = await supabase.from('concepts').select('id, title, data, chapter_id, textbook_id').eq('id', conceptId).maybeSingle();
  if (!concept) return '';
  const { data: chapter } = await supabase.from('chapters').select('id, title').eq('id', concept.chapter_id).maybeSingle();
  const { data: textbook } = await supabase.from('textbooks').select('id, title, subject').eq('id', concept.textbook_id).maybeSingle();
  const summary = (concept.data as any)?.summary || '';
  return `You are helping a student learn the concept "${concept.title}"${textbook ? ` from ${textbook.subject || ''} - "${textbook.title}"` : ''}${chapter ? `, chapter "${chapter.title}"` : ''}.${summary ? `\n\nConcept summary: ${summary}` : ''}\n\nAnswer the student's questions about this concept. Be clear, concise, and use examples where helpful.`;
}

router.post('/chat', authenticate, validate(chatSchema), asyncHandler(async (req, res) => {
  const { message, conceptId, language } = req.body;
  const userId = req.user!.uid;

  const supabase = getSupabaseAdmin();
  if (language && supabase) {
    const session = await getSession(userId);
    if (session) {
      await supabase.from('ai_tutor_sessions').update({ language, updated_at: new Date().toISOString() }).eq('id', session.id);
    }
  }

  await saveMessage(userId, { role: 'user', content: message }, language);

  const session = await getSession(userId);
  const lang = language || (session?.language as string) || 'en';
  const lastMessages = (session?.messages as Array<{ role: string; content: string }>) || [];

  let systemPrompt = 'You are a helpful AI tutor for school students. Answer questions clearly and concisely.';
  if (conceptId) {
    const ctx = await getConceptContext(conceptId);
    if (ctx) systemPrompt = ctx;
  }
  if (lang !== 'en') {
    systemPrompt += `\n\nPlease respond in ${lang}.`;
  }

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      ...lastMessages.slice(-10) as Array<{ role: 'user' | 'system' | 'assistant'; content: string }>,
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  await saveMessage(userId, { role: 'assistant', content: response }, lang);

  sendSuccess(res, { reply: response });
}));

router.get('/session', authenticate, asyncHandler(async (req, res) => {
  const session = await getSession(req.user!.uid);
  sendSuccess(res, { session });
}));

export default router;
