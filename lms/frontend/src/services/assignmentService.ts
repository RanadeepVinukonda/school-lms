import api from './api';
import type { ApiResponse, Assignment, PaginationParams, Submission } from '@/types';

interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** API service for assignment CRUD, submissions, and grading. */
export const assignmentService = {
  /** Fetch all assignments with optional pagination. */
  async getAll(params?: PaginationParams) {
    const response = await api.get<ApiResponse<PaginatedItems<Assignment>>>('/assignments', { params });
    return response.data.data!.items;
  },

  /** Fetch a single assignment by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<Assignment>>(`/assignments/${id}`);
    return response.data;
  },

  /** Create a new assignment. */
  async create(data: Partial<Assignment>) {
    const response = await api.post<ApiResponse<Assignment>>('/assignments', data);
    return response.data;
  },

  /** Update an assignment by id. */
  async update(id: string, data: Partial<Assignment>) {
    const response = await api.put<ApiResponse<Assignment>>(`/assignments/${id}`, data);
    return response.data;
  },

  /** Delete an assignment by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/assignments/${id}`);
    return response.data;
  },

  /** Submit student work for an assignment. */
  async submit(id: string, data: Partial<Submission>) {
    const response = await api.post<ApiResponse<Submission>>(`/assignments/${id}/submit`, data);
    return response.data;
  },

  /** Get all submissions for an assignment. */
  async getSubmissions(id: string) {
    const response = await api.get<ApiResponse<Submission[]>>(`/assignments/${id}/submissions`);
    return response.data;
  },

  /** Grade a submission with score and feedback. */
  async grade(submissionId: string, data: { score: number; feedback: string }) {
    const response = await api.post<ApiResponse<Submission>>(`/submissions/${submissionId}/grade`, data);
    return response.data;
  },
};
