import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { TransactionManager } from '../database/transaction-manager';

/** Create a new conversation with initial participants. */
export async function createConversation(data: {
  participants: string[];
  title?: string;
  type: string;
  metadata?: { classId?: string; courseId?: string };
}) {
  const supabase = getSupabaseClient()!;
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

  const { error: insertError } = await supabase.from('firestore_docs').insert({
    collection: 'conversations', doc_id: conversationId, data: conversation,
    updated_at: now,
  });
  if (insertError) throw new Error(`Failed to create conversation: ${insertError.message}`);

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
  const supabase = getSupabaseClient()!;
  const { data: conv } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'conversations').eq('doc_id', data.conversationId).maybeSingle();

  if (!conv) {
    throw new NotFoundError('Conversation not found');
  }

  const conversationData = conv.data as Record<string, unknown>;
  const participants = conversationData.participants as string[];
  if (!participants.includes(data.senderId)) {
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

  const { error: insertError } = await supabase.from('firestore_docs').insert({
    collection: 'messages', doc_id: messageId, data: message,
    updated_at: now,
  });
  if (insertError) throw new Error(`Failed to send message: ${insertError.message}`);

  const unreadCount: Record<string, number> = {};
  participants.forEach((p: string) => {
    if (p !== data.senderId) {
      unreadCount[p] = ((conversationData.unreadCount as Record<string, number>)?.[p] || 0) + 1;
    }
  });

  const updatedConv = {
    ...conversationData,
    lastMessage: { content: data.content.substring(0, 100), senderId: data.senderId, createdAt: now },
    lastMessageAt: now,
    unreadCount,
    updatedAt: now,
  };
  const { error: updateError } = await supabase.from('firestore_docs').update({ data: updatedConv, updated_at: now })
    .eq('collection', 'conversations').eq('doc_id', data.conversationId);
  if (updateError) throw new Error(`Failed to update conversation: ${updateError.message}`);

  logger.info('Message sent', { messageId, conversationId: data.conversationId, senderId: data.senderId });

  return { ...message };
}

/** Get all conversations for a user, ordered by lastMessageAt desc. Includes unread count for the given user. */
export async function getConversations(userId: string, query: { page?: string; limit?: string }) {
  const supabase = getSupabaseClient()!;
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  const { count } = await supabase.from('firestore_docs')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'conversations')
    .contains('data', { participants: [userId] });

  const { data: rows } = await supabase.from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'conversations')
    .contains('data', { participants: [userId] })
    .order('data->>lastMessageAt', { ascending: false })
    .range(offset, offset + limit - 1);

  const total = count || 0;
  const items = (rows || []).map((row) => ({
    id: row.doc_id,
    ...row.data as Record<string, unknown>,
    unreadCount: ((row.data as Record<string, unknown>).unreadCount as Record<string, number> || {})[userId] || 0,
  }));

  return { items, total, page, limit };
}

/** Get paginated messages in a conversation. Verifies the user is a participant. */
export async function getMessages(conversationId: string, userId: string, query: {
  page?: string;
  limit?: string;
  before?: string;
  after?: string;
}) {
  const supabase = getSupabaseClient()!;
  const { data: conv } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'conversations').eq('doc_id', conversationId).maybeSingle();

  if (!conv) {
    throw new NotFoundError('Conversation not found');
  }

  const conversationData = conv.data as Record<string, unknown>;
  if (!(conversationData.participants as string[]).includes(userId)) {
    throw new ForbiddenError('Not a participant of this conversation');
  }

  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  const { count } = await supabase.from('firestore_docs')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'messages')
    .contains('data', { conversationId });

  const { data: rows } = await supabase.from('firestore_docs')
    .select('doc_id, data')
    .eq('collection', 'messages')
    .contains('data', { conversationId })
    .order('data->>createdAt', { ascending: false })
    .range(offset, offset + limit - 1);

  const total = count || 0;
  const items = (rows || []).map((row) => ({ ...row.data as Record<string, unknown>, id: row.doc_id }));

  return { items, total, page, limit };
}

/** Mark all messages in a conversation as read for the given user. Updates unreadCount and reads messages. */
export async function markConversationRead(conversationId: string, userId: string) {
  const supabase = getSupabaseClient()!;
  const { data: conv } = await supabase.from('firestore_docs').select('data')
    .eq('collection', 'conversations').eq('doc_id', conversationId).maybeSingle();

  if (!conv) {
    throw new NotFoundError('Conversation not found');
  }

  const conversationData = conv.data as Record<string, unknown>;
  const unreadCount = { ...(conversationData.unreadCount as Record<string, number> || {}) };
  unreadCount[userId] = 0;

  const updatedConv = { ...conversationData, unreadCount };
  const { error: updateError } = await supabase.from('firestore_docs').update({ data: updatedConv })
    .eq('collection', 'conversations').eq('doc_id', conversationId);
  if (updateError) throw new Error(`Failed to update conversation: ${updateError.message}`);

  const { data: msgRows } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'messages')
    .contains('data', { conversationId })
    .not('data', 'cs', `{"readBy": ["${userId}"]}`);

  const tm = new TransactionManager();
  await tm.runTransaction(async (tx) => {
    for (const msgRow of msgRows || []) {
      const msgData = msgRow.data as Record<string, unknown>;
      const readBy = (msgData.readBy as string[]) || [];
      if (!readBy.includes(userId)) {
        tx.update('messages', msgRow.doc_id, { readBy: [...readBy, userId] });
      }
    }
  });

  logger.info('Conversation marked as read', { conversationId, userId });
}
