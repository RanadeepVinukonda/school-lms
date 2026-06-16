import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function chat(req: Request, res: Response) {
  const { messages, temperature, max_tokens } = req.body;
  try {
    const content = await aiService.chatCompletion({ model: env.AI_MODEL, messages, temperature, max_tokens });
    sendSuccess(res, { content });
  } catch (err: any) {
    const msg = err?.message || String(err) || 'Unknown AI error';
    try { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ success: false, error: { message: msg } })); } catch {}
  }
}
