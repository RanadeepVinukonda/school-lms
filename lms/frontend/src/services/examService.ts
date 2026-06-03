import api from './api';
import type { ApiResponse, Exam, ExamAttempt, PaginationParams } from '@/types';

interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const examService = {
  async getAll(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PaginatedItems<Exam>>>('/exams', { params });
    return response.data.data!.items;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<Exam>>(`/exams/${id}`);
    return response.data;
  },

  async create(data: Partial<Exam>) {
    const response = await api.post<ApiResponse<Exam>>('/exams', data);
    return response.data;
  },

  async update(id: string, data: Partial<Exam>) {
    const response = await api.put<ApiResponse<Exam>>(`/exams/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/exams/${id}`);
    return response.data;
  },

  async startAttempt(examId: string) {
    const response = await api.post<ApiResponse<ExamAttempt>>(`/exams/${examId}/start`);
    return response.data;
  },

  async submitAttempt(attemptId: string, answers: ExamAttempt['answers']) {
    const response = await api.post<ApiResponse<ExamAttempt>>(`/exam-attempts/${attemptId}/submit`, { answers });
    return response.data;
  },
};
