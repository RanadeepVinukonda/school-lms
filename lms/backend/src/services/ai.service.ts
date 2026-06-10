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

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(errBody: string): number | null {
  try {
    const parsed = JSON.parse(errBody);
    const s = parsed?.error?.metadata?.retry_after_seconds;
    if (typeof s === 'number') return Math.ceil(s * 1000);
    const raw = parsed?.error?.metadata?.raw;
    if (typeof raw === 'string') {
      const m = raw.match(/retry_after_seconds[=:](\d+)/);
      if (m) return parseInt(m[1], 10) * 1000;
    }
  } catch { /* ignore parse errors */ }
  return null;
}

export async function chatCompletion(params: ChatRequest): Promise<string> {
  const { model, messages, temperature = 0.7, max_tokens = 2048 } = params;

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
  };

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(env.AI_BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json() as ChatResponse;
        const content = data.choices?.[0]?.message?.content || '';
        logger.info('AI response received', { model, attempt, contentLength: content.length, contentPreview: content.slice(0, 200) });
        return content;
      }

      const errBody = await res.text();

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryMs = parseRetryAfter(errBody) || BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`AI rate limited, retrying in ${retryMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, { model, status: 429 });
        await sleep(retryMs);
        lastError = errBody;
        continue;
      }

      logger.error('AI API error', { status: res.status, body: errBody, model });
      if (res.status === 401) {
        throw new AppError(502, 'AI service rejected the API key. Check AI_API_KEY.');
      }
      if (res.status === 404) {
        throw new AppError(502, `AI model "${model}" not found. Check AI_MODEL.`);
      }
      throw new AppError(502, `AI API error ${res.status}: ${errBody.slice(0, 500)}`);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`AI request failed, retrying in ${delay}ms`, { model, attempt: attempt + 1, error: err instanceof Error ? err.message : String(err) });
        await sleep(delay);
        lastError = String(err);
        continue;
      }
      throw new AppError(504, `AI request failed after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new AppError(502, `AI API returned 429 after ${MAX_RETRIES} retries: ${(lastError || '').slice(0, 200)}`);
}
