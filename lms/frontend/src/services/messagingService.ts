import api from './api';
import type { ApiResponse, Conversation, Message, PaginatedResponse, PaginationParams } from '@/types';

export const messagingService = {
  async getConversations(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Conversation>>('/messages/conversations', { params });
    return response.data;
  },

  async getConversation(id: string) {
    const response = await api.get<ApiResponse<Conversation>>(`/messages/conversations/${id}`);
    return response.data;
  },

  async getMessages(conversationId: string, params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Message>>(`/messages/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  async sendMessage(conversationId: string, data: { content: string; attachments?: string[] }) {
    const response = await api.post<ApiResponse<Message>>(`/messages/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  async createConversation(data: { participantIds: string[]; subject: string }) {
    const response = await api.post<ApiResponse<Conversation>>('/messages/conversations', data);
    return response.data;
  },

  async markAsRead(conversationId: string) {
    const response = await api.post(`/messages/conversations/${conversationId}/read`);
    return response.data;
  },
};
