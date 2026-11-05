import { env } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { callAIProvider } from '../ai-provider.helper';
import type { ChatMessage } from '../ai.service';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;

export { MAX_RETRIES, BASE_DELAY_MS };

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractJsonBlock(raw: string): string {
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

export function sanitizeJson(raw: string): string {
  return raw.replace(/[\x00-\x1F\u200B-\u200F\uFEFF]/g, '');
}

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

export async function geminiChatCompletion(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  max_tokens: number,
  jsonMode = false,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const { systemInstruction, contents } = convertToGeminiMessages(messages);

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: max_tokens,
  };
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  const timeoutMs = Math.max(60000, max_tokens * 8);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const data = await callAIProvider(
        () => fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        }),
        'Gemini',
        1,
      ) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      };
      clearTimeout(timer);

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') || '';

      if (candidate?.finishReason === 'SAFETY') {
        throw new AppError(502, 'AI response blocked by content safety filters. Try different prompts.');
      }

      logger.info('Gemini response received', { model, attempt, finishReason: candidate?.finishReason, contentLength: text.length });

      const jsonBlock = extractJsonBlock(text);
      const sanitized = sanitizeJson(jsonBlock);
      try {
        const parsed = JSON.parse(sanitized);
        const extracted = parsed.answer || parsed.message || parsed.response || parsed.content || parsed.text || sanitized;
        return typeof extracted === 'string' ? extracted : sanitized;
      } catch {
        logger.warn('Gemini response was not valid JSON, returning raw', {});
        return text;
      }
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
