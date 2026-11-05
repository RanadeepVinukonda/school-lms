import api from './api';
import type { ApiResponse, Course, CourseFilters, Enrollment, PaginatedResponse, PaginationParams } from '@/types';

/** API service for course CRUD, enrollment, and search. */
export const courseService = {
  /** Fetch all courses with optional pagination and filters. */
  async getAll(params?: PaginationParams & CourseFilters) {
    const response = await api.get<PaginatedResponse<Course>>('/courses', { params });
    return response.data;
  },

  /** Fetch a single course by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);
    return response.data;
  },

  /** Create a new course. */
  async create(data: Partial<Course>) {
    const response = await api.post<ApiResponse<Course>>('/courses', data);
    return response.data;
  },

  /** Update a course by id. */
  async update(id: string, data: Partial<Course>) {
    const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data);
    return response.data;
  },

  /** Delete a course by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/courses/${id}`);
    return response.data;
  },

  /** Enroll the current user in a course. */
  async enroll(courseId: string) {
    const response = await api.post<ApiResponse<Enrollment>>(`/courses/${courseId}/enroll`);
    return response.data;
  },

  /** Fetch all enrollments for the current user. */
  async getEnrollments(params?: PaginationParams) {
    const response = await api.get<PaginatedResponse<Enrollment>>('/courses/enrollments', { params });
    return response.data;
  },

  /** Search courses by query string. */
  async search(query: string) {
    const response = await api.get<ApiResponse<Course[]>>('/courses/search', { params: { q: query } });
    return response.data;
  },
};
