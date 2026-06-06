import api from './api';
import type { ApiResponse, Exam, ExamAttempt, PaginationParams } from '@/types';

interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** API service for exam CRUD and attempt management. */
export const examService = {
  /** Fetch all exams with optional pagination. */
  async getAll(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PaginatedItems<Exam>>>('/exams', { params });
    return response.data.data!.items;
  },

  /** Fetch a single exam by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<Exam>>(`/exams/${id}`);
    return response.data;
  },

  /** Create a new exam. */
  async create(data: Partial<Exam>) {
    const response = await api.post<ApiResponse<Exam>>('/exams', data);
    return response.data;
  },

  /** Update an exam by id. */
  async update(id: string, data: Partial<Exam>) {
    const response = await api.put<ApiResponse<Exam>>(`/exams/${id}`, data);
    return response.data;
  },

  /** Delete an exam by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/exams/${id}`);
    return response.data;
  },

  /** Start a new attempt for the current user on the given exam. */
  async startAttempt(examId: string) {
    const response = await api.post<ApiResponse<ExamAttempt>>(`/exams/${examId}/start`);
    return response.data;
  },

  /** Submit answers for an exam attempt. */
  async submitAttempt(attemptId: string, answers: ExamAttempt['answers']) {
    const response = await api.post<ApiResponse<ExamAttempt>>(`/exam-attempts/${attemptId}/submit`, { answers });
    return response.data;
  },
};
