import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function chat(req: Request, res: Response) {
  const { messages, temperature, max_tokens, jsonMode } = req.body;
  try {
    const content = await aiService.chatCompletion({ model: env.AI_MODEL, messages, temperature, max_tokens, jsonMode });
    sendSuccess(res, { content });
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Unknown AI error';
    res.status(502).json({ success: false, error: { message: msg } });
  }
}
}
