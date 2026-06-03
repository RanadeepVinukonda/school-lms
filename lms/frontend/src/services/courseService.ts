import api from './api';
import type { ApiResponse, Course, CourseFilters, Enrollment, PaginatedResponse, PaginationParams } from '@/types';

export const courseService = {
  async getAll(params?: PaginationParams & CourseFilters) {
    const response = await api.get<PaginatedResponse<Course>>('/courses', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data;
  },

  async create(data: Partial<Course>) {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return response.data;
  },

  async update(id: string, data: Partial<Course>) {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/courses/${id}`);
    return response.data;
  },

  async enroll(courseId: string) {
    const response = await api.post<ApiResponse<Enrollment>>(`/courses/${courseId}/enroll`);
    return response.data;
  },

  async getEnrollments(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Enrollment>>('/courses/enrollments', { params });
    return response.data;
  },

  async search(query: string) {
    const response = await api.get<ApiResponse<Course[]>>('/courses/search', { params: { q: query } });
    return response.data;
  },
};
