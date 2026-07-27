import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { MemoryCache } from '../utils/cache';
import { geminiChatCompletion } from './ai-providers/gemini.provider';
import { openaiChatCompletion } from './ai-providers/openrouter.provider';

const aiResponseCache = new MemoryCache('ai-responses', { defaultTtlMs: 3600_000, maxSize: 100 });

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}

export { textbookChatCompletion } from './ai-providers/openrouter.provider';

function toGeminiModel(model: string): string {
  const m = model.trim().replace(/^google\//, '');
  return m || 'gemini-2.0-flash';
}

export async function chatCompletion(params: ChatRequest): Promise<string> {
  const { model = env.AI_MODEL, messages, temperature = 0.7, max_tokens = 2048, jsonMode = false } = params;

  const cacheKey = `ai:${JSON.stringify(messages.slice(0, 2))}`;
  const cached = aiResponseCache.get<string>(cacheKey);
  if (cached) return cached;

  if (!env.GEMINI_API_KEY) {
    throw new AppError(502, 'No AI provider configured. Set GEMINI_API_KEY.');
  }

  try {
    if (env.GEMINI_API_KEY) {
      const result = await geminiChatCompletion(toGeminiModel(model), messages, temperature, max_tokens, jsonMode);
      aiResponseCache.set(cacheKey, result);
      return result;
    }
    const result = await openaiChatCompletion(model, messages, temperature, max_tokens, jsonMode);
    aiResponseCache.set(cacheKey, result);
    return result;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Circuit breaker') && err.message.includes('OPEN')) {
      logger.warn('AI circuit breaker OPEN, returning fallback response');
      const fallback = jsonMode
        ? '{"answer":"I am temporarily unable to process AI requests. Please try again in a moment."}'
        : 'I am temporarily unable to process AI requests. Please try again in a moment.';
      return fallback;
    }
    throw err;
  }
}
