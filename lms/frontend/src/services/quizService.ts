import api from './api';
import type { ApiResponse, PaginationParams, Quiz, QuizAttempt } from '@/types';

interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** API service for quiz CRUD, attempts, and results. */
export const quizService = {
  /** Fetch all quizzes with optional pagination. */
  async getAll(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PaginatedItems<Quiz>>>('/quizzes', { params });
    return response.data.data!.items;
  },

  /** Fetch a single quiz by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<Quiz>>(`/quizzes/${id}`);
    return response.data;
  },

  /** Create a new quiz. */
  async create(data: Partial<Quiz>) {
    const response = await api.post<ApiResponse<Quiz>>('/quizzes', data);
    return response.data;
  },

  /** Update a quiz by id. */
  async update(id: string, data: Partial<Quiz>) {
    const response = await api.put<ApiResponse<Quiz>>(`/quizzes/${id}`, data);
    return response.data;
  },

  /** Delete a quiz by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/quizzes/${id}`);
    return response.data;
  },

  /** Start a new quiz attempt for the current user. */
  async startAttempt(quizId: string) {
    const response = await api.post<ApiResponse<QuizAttempt>>(`/quizzes/${quizId}/start`);
    return response.data;
  },

  /** Submit answers for a quiz attempt. */
  async submitAttempt(attemptId: string, answers: QuizAttempt['answers']) {
    const response = await api.post<ApiResponse<QuizAttempt>>(`/quiz-attempts/${attemptId}/submit`, { answers });
    return response.data;
  },

  /** Get all attempts for a specific quiz. */
  async getAttempts(quizId: string) {
    const response = await api.get<ApiResponse<QuizAttempt[]>>(`/quizzes/${quizId}/attempts`);
    return response.data;
  },
};
