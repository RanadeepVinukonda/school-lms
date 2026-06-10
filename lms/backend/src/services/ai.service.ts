import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function chatCompletion(params: ChatRequest): Promise<string> {
  const { model, messages, temperature = 0.7, max_tokens = 2048 } = params;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${env.AI_API_KEY}`,
  };

  if (env.AI_BASE_URL.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://school-lms-nine-phi.vercel.app';
    headers['X-Title'] = 'School LMS';
  }

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens,
    response_format: { type: 'json_object' },
  };

  let res: Response;
  try {
    res = await fetch(env.AI_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    throw new AppError(504, `AI request timed out or failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.text();
    logger.error('AI API error', { status: res.status, body: err, model });
    if (res.status === 401) {
      throw new AppError(502, 'AI service rejected the API key. Check AI_API_KEY.');
    }
    if (res.status === 404) {
      throw new AppError(502, `AI model "${model}" not found. Check AI_MODEL.`);
    }
    throw new AppError(502, `AI API error ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json() as ChatResponse;
  const content = data.choices?.[0]?.message?.content || '';
  logger.info('AI response received', { model, contentLength: content.length, contentPreview: content.slice(0, 200) });
  return content;
}
