import api from './api';
import type { ApiResponse, Exam, ExamAttempt, PaginatedResponse, PaginationParams } from '@/types';

export const examService = {
  async getAll(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Exam>>('/exams', { params });
    return response.data;
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
