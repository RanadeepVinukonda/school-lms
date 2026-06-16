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

const MAX_RETRIES = 2;
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
    const msg = parsed?.error?.message;
    if (typeof msg === 'string') {
      const m = msg.match(/retry in\s*(\d+(?:\.\d+)?)\s*s/i);
      if (m) return Math.ceil(parseFloat(m[1]) * 1000);
    }
  } catch { /* ignore parse errors */ }
  return null;
}

function extractJsonBlock(raw: string): string {
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gm, '').trim();
  const braceStart = cleaned.indexOf('{');
  if (braceStart === -1) return cleaned;
  let depth = 0;
  let inString = false;
  for (let i = braceStart; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === '"' && (i === 0 || cleaned[i - 1] !== '\\')) inString = !inString;
    if (inString) continue;
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return cleaned.slice(braceStart, i + 1);
    }
  }
  return cleaned;
}

function sanitizeJson(raw: string): string {
  return raw.replace(/[\x00-\x1F\u200B-\u200F\uFEFF]/g, '');
}

/* ── Gemini provider ─────────────────────────────────────────── */

function convertToGeminiMessages(messages: ChatMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
} {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const systemInstruction = systemMsgs.length > 0
    ? { parts: systemMsgs.map((m) => ({ text: m.content })) }
    : undefined;

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return { systemInstruction, contents };
}

function extractGeminiError(errBody: string): number | null {
  try {
    const parsed = JSON.parse(errBody);
    return parsed?.error?.code ?? null;
  } catch {
    return null;
  }
}

async function geminiChatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  max_tokens: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const { systemInstruction, contents } = convertToGeminiMessages(messages);

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: max_tokens,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json() as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
        };
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') || '';

        if (candidate?.finishReason === 'SAFETY') {
          throw new AppError(502, 'AI response blocked by content safety filters. Try different prompts.');
        }

        logger.info('Gemini response received', { model, attempt, finishReason: candidate?.finishReason, contentLength: text.length, contentPreview: text.slice(0, 200) });

        const jsonBlock = extractJsonBlock(text);
        const sanitized = sanitizeJson(jsonBlock);
        try {
          const parsed = JSON.parse(sanitized);
          const extracted = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || sanitized;
          return typeof extracted === 'string' ? extracted : sanitized;
        } catch {
          logger.warn('Gemini response was not valid JSON, returning raw', { contentPreview: text.slice(0, 200) });
          return text;
        }
      }

      const errBody = await res.text();
      const httpCode = extractGeminiError(errBody);

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryMs = parseRetryAfter(errBody) || BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Gemini rate limited, retrying in ${retryMs}ms`, { model, attempt: attempt + 1 });
        await sleep(retryMs);
        continue;
      }

      logger.error('Gemini API error', { status: res.status, body: errBody, model });
      if (res.status === 403) {
        throw new AppError(502, 'Gemini API key is invalid or billing not enabled. Check GEMINI_API_KEY.');
      }
      throw new AppError(502, `Gemini API error ${res.status}: ${errBody.slice(0, 500)}`);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Gemini request failed, retrying in ${delay}ms`, { attempt: attempt + 1, error: err instanceof Error ? err.message : String(err) });
        await sleep(delay);
        continue;
      }
      throw new AppError(504, `Gemini request failed after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new AppError(502, 'Gemini API returned 429 after retries');
}

/* ── OpenAI / OpenRouter provider ────────────────────────────── */

async function openaiChatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  max_tokens: number,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${env.AI_API_KEY}`,
  };

  if (env.AI_BASE_URL.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://school-lms-nine-phi.vercel.app';
    headers['X-Title'] = 'School LMS';
  }

  let useResponseFormat = true;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens,
    };
    if (useResponseFormat) {
      payload.response_format = { type: 'json_object' };
    }

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
        logger.info('AI response received', { model, attempt, useResponseFormat, contentLength: content.length, contentPreview: content.slice(0, 200) });

        const jsonBlock = extractJsonBlock(content);
        const sanitized = sanitizeJson(jsonBlock);
        try {
          const parsed = JSON.parse(sanitized);
          const text = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || sanitized;
          return typeof text === 'string' ? text : sanitized;
        } catch {
          logger.warn('AI response was not valid JSON, returning raw content', { contentPreview: content.slice(0, 200) });
          return content;
        }
      }

      const errBody = await res.text();

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryMs = parseRetryAfter(errBody) || BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`AI rate limited, retrying in ${retryMs}ms`, { model, attempt: attempt + 1 });
        await sleep(retryMs);
        lastError = errBody;
        continue;
      }

      if (res.status === 400 && useResponseFormat && (errBody.includes('response_format') || errBody.includes('json_object'))) {
        logger.warn('Model does not support response_format, retrying without it', { errBody: errBody.slice(0, 200) });
        useResponseFormat = false;
        continue;
      }

      logger.error('AI API error', { status: res.status, body: errBody, model, attempt });
      if (res.status === 401) throw new AppError(502, 'AI service rejected the API key. Check AI_API_KEY.');
      if (res.status === 404 && model !== 'openrouter/free') {
        logger.warn('AI model not found, retrying with openrouter/free', { model });
        return openaiChatCompletion('openrouter/free', messages, temperature, max_tokens);
      }
      throw new AppError(502, `AI API error ${res.status}: ${errBody.slice(0, 500)}`);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`AI request failed, retrying in ${delay}ms`, { attempt: attempt + 1, error: err instanceof Error ? err.message : String(err) });
        await sleep(delay);
        lastError = String(err);
        continue;
      }
      throw new AppError(504, `AI request failed after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new AppError(502, `AI API returned 429 after ${MAX_RETRIES} retries: ${(lastError || '').slice(0, 200)}`);
}

/* ── Dispatcher ──────────────────────────────────────────────── */

export async function chatCompletion(params: ChatRequest): Promise<string> {
  const { model, messages, temperature = 0.7, max_tokens = 2048 } = params;

  if (env.GEMINI_API_KEY) {
    return geminiChatCompletion(model, messages, temperature, max_tokens);
  }

  if (!env.AI_API_KEY) {
    throw new AppError(502, 'No AI provider configured. Set GEMINI_API_KEY or AI_API_KEY.');
  }

  return openaiChatCompletion(model, messages, temperature, max_tokens);
}
