import api from './api';
import type { ApiResponse, PaginatedResponse, PaginationParams, Quiz, QuizAttempt } from '@/types';

export const quizService = {
  async getAll(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Quiz>>('/quizzes', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<Quiz>>(`/quizzes/${id}`);
    return response.data;
  },

  async create(data: Partial<Quiz>) {
    const response = await api.post<ApiResponse<Quiz>>('/quizzes', data);
    return response.data;
  },

  async update(id: string, data: Partial<Quiz>) {
    const response = await api.put<ApiResponse<Quiz>>(`/quizzes/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/quizzes/${id}`);
    return response.data;
  },

  async startAttempt(quizId: string) {
    const response = await api.post<ApiResponse<QuizAttempt>>(`/quizzes/${quizId}/start`);
    return response.data;
  },

  async submitAttempt(attemptId: string, answers: QuizAttempt['answers']) {
    const response = await api.post<ApiResponse<QuizAttempt>>(`/quiz-attempts/${attemptId}/submit`, { answers });
    return response.data;
  },

  async getAttempts(quizId: string) {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(`/quizzes/${quizId}/attempts`);
    return response.data;
  },
};
