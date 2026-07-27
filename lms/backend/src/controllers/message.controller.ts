import { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { requireUser } from '../types/common';

export async function createConversation(req: Request, res: Response) {
  const result = await messageService.createConversation(req.body);
  sendCreated(res, result, 'Conversation created');
}

export async function sendMessage(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await messageService.sendMessage({ ...req.body, senderId: user.uid });
  sendCreated(res, result, 'Message sent');
}

export async function getConversations(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await messageService.getConversations(user.uid, req.query as Record<string, unknown>);
  sendSuccess(res, result);
}

export async function getMessages(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await messageService.getMessages(req.params.conversationId, user.uid, req.query as Record<string, unknown>);
  sendSuccess(res, result);
}

export async function markConversationRead(req: Request, res: Response) {
  const user = requireUser(req);
  await messageService.markConversationRead(req.params.conversationId, user.uid);
  sendSuccess(res, null, 'Conversation marked as read');
}
