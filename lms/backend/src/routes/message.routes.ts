import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { sendMessageSchema, createConversationSchema } from '../validators/message.validator';
import { asyncHandler } from '../middlewares/asyncHandler';

const router = Router();

router.get('/conversations', authenticate, asyncHandler(messageController.getConversations));
router.post('/conversations', authenticate, validate(createConversationSchema), asyncHandler(messageController.createConversation));
router.get('/conversations/:conversationId/messages', authenticate, asyncHandler(messageController.getMessages));
router.post('/send', authenticate, validate(sendMessageSchema), asyncHandler(messageController.sendMessage));
router.put('/conversations/:conversationId/read', authenticate, asyncHandler(messageController.markConversationRead));

export default router;
