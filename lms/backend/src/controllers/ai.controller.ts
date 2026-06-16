import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function chat(req: Request, res: Response) {
  try {
    const { messages, temperature, max_tokens } = req.body;
    const content = await aiService.chatCompletion({ model: env.AI_MODEL, messages, temperature, max_tokens });
    sendSuccess(res, { content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ success: false, error: { message: msg } });
  }
}
