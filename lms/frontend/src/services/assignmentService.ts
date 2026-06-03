import api from './api';
import type { ApiResponse, Assignment, PaginationParams, Submission } from '@/types';

interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const assignmentService = {
  async getAll(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PaginatedItems<Assignment>>>('/assignments', { params });
    return response.data.data!.items;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<Assignment>>(`/assignments/${id}`);
    return response.data;
  },

  async create(data: Partial<Assignment>) {
    const response = await api.post<ApiResponse<Assignment>>('/assignments', data);
    return response.data;
  },

  async update(id: string, data: Partial<Assignment>) {
    const response = await api.put<ApiResponse<Assignment>>(`/assignments/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/assignments/${id}`);
    return response.data;
  },

  async submit(id: string, data: Partial<Submission>) {
    const response = await api.post<ApiResponse<Submission>>(`/assignments/${id}/submit`, data);
    return response.data;
  },

  async getSubmissions(id: string) {
    const response = await api.get<ApiResponse<Submission[]>>(`/assignments/${id}/submissions`);
    return response.data;
  },

  async grade(submissionId: string, data: { score: number; feedback: string }) {
    const response = await api.post<ApiResponse<Submission>>(`/submissions/${submissionId}/grade`, data);
    return response.data;
  },
};
