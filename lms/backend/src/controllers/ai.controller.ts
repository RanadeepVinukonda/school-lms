import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function chat(req: Request, res: Response) {
  const { model, messages, temperature, max_tokens } = req.body;
  const content = await aiService.chatCompletion({ model: model || env.AI_MODEL, messages, temperature, max_tokens });
  sendSuccess(res, { content });
}
