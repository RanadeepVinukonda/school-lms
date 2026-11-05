import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { callAIProvider } from '../ai-provider.helper';
import { MAX_RETRIES, BASE_DELAY_MS, sleep, extractJsonBlock, sanitizeJson } from './gemini.provider';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function openaiChatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  max_tokens: number,
  jsonMode = true,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${env.GEMINI_API_KEY}`,
  };

  if (env.AI_BASE_URL.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://school-lms-nine-phi.vercel.app';
    headers['X-Title'] = 'Genesis';
  }

  let useResponseFormat = jsonMode;
  let lastError: string | null = null;

  const timeoutMs = Math.max(60000, max_tokens * 8);

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
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const data = await callAIProvider(
        () => fetch(env.AI_BASE_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        }),
        'OpenAI',
        1,
      ) as ChatResponse;
      clearTimeout(timer);

      const content = data.choices?.[0]?.message?.content || '';
      logger.info('AI response received', { model, attempt, useResponseFormat, contentLength: content.length });

      if (!jsonMode) return content;

      const jsonBlock = extractJsonBlock(content);
      const sanitized = sanitizeJson(jsonBlock);
      try {
        const parsed = JSON.parse(sanitized);
        const text = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || sanitized;
        return typeof text === 'string' ? text : sanitized;
      } catch {
        logger.warn('AI response was not valid JSON, returning raw content', {});
        return content;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.message.includes('OpenAI API error: 400') && useResponseFormat) {
        logger.warn('Model does not support response_format, retrying without it');
        useResponseFormat = false;
        continue;
      }

      if (err instanceof Error && err.message.includes('OpenAI API error: 429') && attempt < MAX_RETRIES) {
        lastError = err.message;
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (err instanceof Error && err.message.includes('OpenAI API error: 401')) {
        throw new AppError(502, 'AI service rejected the API key. Check GEMINI_API_KEY.');
      }

      if (err instanceof Error && err.message.includes('OpenAI API error: 404') && model !== 'openrouter/free') {
        logger.warn('AI model not found, retrying with openrouter/free', { model });
        return openaiChatCompletion('openrouter/free', messages, temperature, max_tokens, jsonMode);
      }

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

export async function textbookChatCompletion(params: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { messages, temperature = 0.7, max_tokens = 2048, jsonMode = false } = params;

  const apiKey = env.AI_TEXTBOOK_API_KEY || env.GEMINI_API_KEY;
  const baseUrl = env.AI_TEXTBOOK_BASE_URL || env.AI_BASE_URL;
  const model = params.model || env.AI_TEXTBOOK_MODEL || env.AI_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) throw new AppError(502, 'No textbook AI provider configured. Set AI_TEXTBOOK_API_KEY.');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://school-lms-nine-phi.vercel.app';
    headers['X-Title'] = 'Genesis';
  }

  let useResponseFormat = jsonMode;
  let lastError: string | null = null;
  const timeoutMs = Math.max(60000, max_tokens * 8);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const payload: Record<string, unknown> = { model, messages, temperature, max_tokens };
    if (useResponseFormat) payload.response_format = { type: 'json_object' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const data = await callAIProvider(
        () => fetch(baseUrl, {
          method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal,
        }),
        'Textbook AI',
        1,
      ) as ChatResponse;
      clearTimeout(timer);

      const content = data.choices?.[0]?.message?.content || '';
      logger.info('Textbook AI response received', { model, attempt, contentLength: content.length });

      if (!jsonMode) return content;
      const jsonBlock = extractJsonBlock(content);
      const sanitized = sanitizeJson(jsonBlock);
      try {
        const parsed = JSON.parse(sanitized);
        const text = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || sanitized;
        return typeof text === 'string' ? text : sanitized;
      } catch {
        logger.warn('Textbook AI response was not valid JSON, returning raw', {});
        return content;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof AppError) throw err;

      if (err instanceof Error && err.message.includes('Textbook AI API error: 400') && useResponseFormat) {
        logger.warn('Textbook AI model does not support response_format, retrying without it');
        useResponseFormat = false;
        continue;
      }

      if (err instanceof Error && err.message.includes('Textbook AI API error: 429') && attempt < MAX_RETRIES) {
        lastError = err.message;
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      if (err instanceof Error && err.message.includes('Textbook AI API error: 401')) {
        throw new AppError(502, 'Textbook AI key rejected. Check AI_TEXTBOOK_API_KEY or GEMINI_API_KEY.');
      }

      if (err instanceof Error && err.message.includes('Textbook AI API error: 404') && model !== 'openrouter/free') {
        logger.warn('Textbook AI model not found, retrying with openrouter/free', { model });
        return textbookChatCompletion({ ...params, model: 'openrouter/free' });
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Textbook AI request failed, retrying in ${delay}ms`, { attempt: attempt + 1, error: err instanceof Error ? err.message : String(err) });
        await sleep(delay);
        lastError = String(err);
        continue;
      }
      throw new AppError(504, `Textbook AI failed after ${MAX_RETRIES + 1} attempts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new AppError(502, `Textbook AI returned 429 after ${MAX_RETRIES} retries: ${(lastError || '').slice(0, 200)}`);
}
