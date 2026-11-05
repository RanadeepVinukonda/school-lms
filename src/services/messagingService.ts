import api from './api';
import type { ApiResponse, Conversation, Message, PaginatedResponse, PaginationParams } from '@/types';

/** API service for messaging — conversations and messages. */
export const messagingService = {
  /** Fetch all conversations for the current user. */
  async getConversations(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Conversation>>('/messages/conversations', { params });
    return response.data;
  },

  /** Fetch a single conversation by id. */
  async getConversation(id: string) {
    const response = await api.get<ApiResponse<Conversation>>(`/messages/conversations/${id}`);
    return response.data;
  },

  /** Fetch paginated messages within a conversation. */
  async getMessages(conversationId: string, params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Message>>(`/messages/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  /** Send a message in a conversation. */
  async sendMessage(conversationId: string, data: { content: string; attachments?: string[] }) {
    const response = await api.post<ApiResponse<Message>>(`/messages/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  /** Create a new conversation with the given participants and subject. */
  async createConversation(data: { participantIds: string[]; subject: string }) {
    const response = await api.post<ApiResponse<Conversation>>('/messages/conversations', data);
    return response.data;
  },

  /** Mark a conversation as read for the current user. */
  async markAsRead(conversationId: string) {
    const response = await api.post(`/messages/conversations/${conversationId}/read`);
    return response.data;
  },
};
