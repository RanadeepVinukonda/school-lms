import { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import { sendSuccess, sendCreated } from '../utils/response';

export async function createConversation(req: Request, res: Response) {
  const result = await messageService.createConversation(req.body);
  sendCreated(res, result, 'Conversation created');
}

export async function sendMessage(req: Request, res: Response) {
  const result = await messageService.sendMessage({ ...req.body, senderId: req.user!.uid });
  sendCreated(res, result, 'Message sent');
}

export async function getConversations(req: Request, res: Response) {
  const result = await messageService.getConversations(req.user!.uid, req.query as any);
  sendSuccess(res, result);
}

export async function getMessages(req: Request, res: Response) {
  const result = await messageService.getMessages(req.params.conversationId, req.user!.uid, req.query as any);
  sendSuccess(res, result);
}

export async function markConversationRead(req: Request, res: Response) {
  await messageService.markConversationRead(req.params.conversationId, req.user!.uid);
  sendSuccess(res, null, 'Conversation marked as read');
}
