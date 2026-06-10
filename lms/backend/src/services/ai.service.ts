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
  const isGemini = env.AI_BASE_URL.includes('generativelanguage.googleapis.com');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    if (isGemini) {
      const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.AI_API_KEY}`;
      
      const geminiContents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const systemMsg = messages.find((m) => m.role === 'system');
      const systemInstruction = systemMsg
        ? { parts: [{ text: systemMsg.content }] }
        : undefined;

      const payload = {
        contents: geminiContents,
        systemInstruction,
        generationConfig: {
          temperature,
          maxOutputTokens: max_tokens,
          responseMimeType: 'application/json',
        },
      };

      res = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } else {
      const payload: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens,
        response_format: { type: 'json_object' },
      };

      res = await fetch(env.AI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${env.AI_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }
  } catch (err) {
    throw new AppError(504, `AI request timed out or failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.text();
    logger.error('AI API error', { status: res.status, body: err, url: env.AI_BASE_URL, model });
    if (res.status === 401) {
      throw new AppError(502, 'AI service rejected the API key. Check AI_API_KEY.');
    }
    if (res.status === 404) {
      throw new AppError(502, `AI model "${model}" not found. Check AI_MODEL.`);
    }
    throw new AppError(502, `AI API error ${res.status}: ${err.slice(0, 500)}`);
  }

  if (isGemini) {
    const data = await res.json() as any;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    logger.info('AI response received (Gemini Native)', { model, contentLength: content.length, contentPreview: content.slice(0, 200) });
    return content;
  } else {
    const data = await res.json() as ChatResponse;
    const content = data.choices?.[0]?.message?.content || '';
    logger.info('AI response received (OpenAI Compatible)', { model, contentLength: content.length, contentPreview: content.slice(0, 200) });
    return content;
  }
}
