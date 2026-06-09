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
  const { model, messages, temperature = 0.3, max_tokens = 32000 } = params;

  const payload = { model, messages, temperature, max_tokens };

  const res = await fetch(env.AI_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error('AI API error', { status: res.status, body: err });
    if (res.status === 401) {
      throw new AppError(502, 'AI service rejected the API key. Check AI_API_KEY.');
    }
    throw new AppError(502, `AI API error ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json() as ChatResponse;
  const content = data.choices?.[0]?.message?.content || '';
  return content;
}
