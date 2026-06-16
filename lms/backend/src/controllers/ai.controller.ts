import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function chat(req: Request, res: Response) {
  res.status(200).json({ success: true, data: { content: 'Debug: controller reached. AI call pending...' } });
  return;
}
