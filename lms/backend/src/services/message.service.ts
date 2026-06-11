import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

/** Create a new conversation with initial participants. */
export async function createConversation(data: {
  participants: string[];
  title?: string;
  type: string;
  metadata?: { classId?: string; courseId?: string };
}) {
  const conversationId = uuidv4();
  const now = new Date().toISOString();

  const conversation = {
    id: conversationId,
    participants: data.participants,
    title: data.title || '',
    type: data.type,
    metadata: data.metadata || {},
    lastMessage: null,
    lastMessageAt: now,
    unreadCount: {},
    createdAt: now,
    updatedAt: now,
  };

  await collections.conversations().doc(conversationId).set(conversation);

  logger.info('Conversation created', { conversationId, type: data.type });

  return { ...conversation };
}

/** Send a message in a conversation. Updates lastMessage and unreadCount. */
export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: string;
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
  parentMessageId?: string;
}) {
  const conversationRef = collections.conversations().doc(data.conversationId);
  const conversation = await conversationRef.get();

  if (!conversation.exists) {
    throw new NotFoundError('Conversation not found');
  }

  const conversationData = conversation.data()!;
  if (!conversationData.participants.includes(data.senderId)) {
    throw new ForbiddenError('Not a participant of this conversation');
  }

  const messageId = uuidv4();
  const now = new Date().toISOString();

  const message = {
    id: messageId,
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content,
    messageType: data.messageType || 'text',
    attachments: data.attachments || [],
    parentMessageId: data.parentMessageId || null,
    readBy: [data.senderId],
    createdAt: now,
  };

  await collections.messages().doc(messageId).set(message);

  const unreadCount: Record<string, number> = {};
  conversationData.participants.forEach((p: string) => {
    if (p !== data.senderId) {
      unreadCount[p] = (conversationData.unreadCount?.[p] || 0) + 1;
    }
  });

  await conversationRef.update({
    lastMessage: {
      content: data.content.substring(0, 100),
      senderId: data.senderId,
      createdAt: now,
    },
    lastMessageAt: now,
    unreadCount,
    updatedAt: now,
  });

  logger.info('Message sent', { messageId, conversationId: data.conversationId, senderId: data.senderId });

  return { ...message };
}

/** Get all conversations for a user, ordered by lastMessageAt desc. Includes unread count for the given user. */
export async function getConversations(userId: string, query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const snapshot = await collections.conversations()
    .where('participants', 'array-contains', userId)
    .get();
  const all = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    unreadCount: (doc.data().unreadCount || {})[userId] || 0,
  }));
  const sorted = all.sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  const total = sorted.length;
  const offset = (page - 1) * limit;
  const items = sorted.slice(offset, offset + limit);
  return { items, total, page, limit };
}

/** Get paginated messages in a conversation. Verifies the user is a participant. */
/** Get paginated messages in a conversation. Verifies the user is a participant. */
export async function getMessages(conversationId: string, userId: string, query: {
  page?: string;
  limit?: string;
  before?: string;
  after?: string;
}) {
  const conversationRef = collections.conversations().doc(conversationId);
  const conversation = await conversationRef.get();

  if (!conversation.exists) {
    throw new NotFoundError('Conversation not found');
  }

  const conversationData = conversation.data()!;
  if (!conversationData.participants.includes(userId)) {
    throw new ForbiddenError('Not a participant of this conversation');
  }

  const { page, limit } = parsePagination(query);
  const snapshot = await collections.messages()
    .where('conversationId', '==', conversationId)
    .get();
  const all = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  const sorted = all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = sorted.length;
  const offset = (page - 1) * limit;
  const items = sorted.slice(offset, offset + limit);
  return { items, total, page, limit };
}

/** Mark all messages in a conversation as read for the given user. Updates unreadCount and reads messages. */
export async function markConversationRead(conversationId: string, userId: string) {
  const ref = collections.conversations().doc(conversationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Conversation not found');
  }

  const data = doc.data()!;
  const unreadCount = { ...(data.unreadCount || {}) };
  unreadCount[userId] = 0;

  await ref.update({ unreadCount });

  const messagesSnapshot = await collections.messages()
    .where('conversationId', '==', conversationId)
    .where('readBy', 'not-in', [[userId]])
    .get();

  const batch = collections.messages().firestore.batch();
  messagesSnapshot.docs.forEach((msgDoc) => {
    const readBy = msgDoc.data().readBy || [];
    if (!readBy.includes(userId)) {
      batch.update(msgDoc.ref, { readBy: [...readBy, userId] });
    }
  });

  await batch.commit();

  logger.info('Conversation marked as read', { conversationId, userId });
}
