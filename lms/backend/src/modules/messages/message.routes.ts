import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createConversationSchema, sendMessageSchema } from "../../validators/message.validator";
import * as messageController from "./message.controller";

const router = Router();

router.use(authenticate);

router.get("/conversations", messageController.getConversations);
router.post("/conversations", validate(createConversationSchema), messageController.createConversation);
router.get("/conversations/:conversationId/messages", messageController.getMessages);
router.post("/conversations/:conversationId/messages", validate(sendMessageSchema), messageController.sendMessage);
router.patch("/conversations/:conversationId/read", messageController.markConversationRead);

export default router;

