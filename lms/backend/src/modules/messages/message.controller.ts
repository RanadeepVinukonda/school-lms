
import * as messageService from "../../services/message.service";
import { sendSuccess, sendCreated, buildPaginationMeta } from "../../utils/response";
import { parsePagination } from "../../utils/pagination";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { AuthRequest } from "../../middlewares/auth.middleware";

export const createConversation = asyncHandler(async (req: AuthRequest, res) => {
  const conversation = await messageService.createConversation(req.user!.id, req.body);
  sendCreated(res, "Conversation created", conversation);
});

export const sendMessage = asyncHandler(async (req: AuthRequest, res) => {
  const message = await messageService.sendMessage(req.user!.id, req.params.conversationId, req.body);
  sendCreated(res, "Message sent", message);
});

export const getConversations = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  const result = await messageService.getConversations(req.user!.id, pagination);
  sendSuccess(res, "Conversations retrieved", {
    conversations: result.conversations,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const getMessages = asyncHandler(async (req: AuthRequest, res) => {
  const pagination = parsePagination(req.query);
  const result = await messageService.getMessages(req.params.conversationId, req.user!.id, pagination);
  sendSuccess(res, "Messages retrieved", {
    messages: result.messages,
    pagination: buildPaginationMeta(result.total, pagination),
  });
});

export const markConversationRead = asyncHandler(async (req: AuthRequest, res) => {
  await messageService.markConversationRead(req.params.conversationId, req.user!.id);
  sendSuccess(res, "Conversation marked as read");
});

