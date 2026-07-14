import api from './api';
import type { ApiResponse, Lesson, LessonProgress, PaginatedResponse } from '@/types';

/** API service for lesson CRUD and progress tracking. */
export const lessonService = {
  /** Fetch all lessons for a given module. */
  async getByModule(moduleId: string) {
    const response = await api.get<ApiResponse<Lesson[]>>(`/modules/${moduleId}/lessons`);
    return response.data;
  },

  /** Fetch a single lesson by id. */
  async getById(id: string) {
    const response = await api.get<ApiResponse<Lesson>>(`/lessons/${id}`);
    return response.data;
  },

  /** Create a new lesson. */
  async create(data: Partial<Lesson>) {
    const response = await api.post<ApiResponse<Lesson>>('/lessons', data);
    return response.data;
  },

  /** Update a lesson by id. */
  async update(id: string, data: Partial<Lesson>) {
    const response = await api.put<ApiResponse<Lesson>>(`/lessons/${id}`, data);
    return response.data;
  },

  /** Delete a lesson by id. */
  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/lessons/${id}`);
    return response.data;
  },

  /** Mark a lesson as complete for the current user. */
  async markComplete(lessonId: string) {
    const response = await api.post<ApiResponse<LessonProgress>>(`/lessons/${lessonId}/complete`);
    return response.data;
  },

  /** Get progress data for all lessons in a course. */
  async getProgress(courseId: string) {
    const response = await api.get<ApiResponse<LessonProgress[]>>(`/courses/${courseId}/progress`);
    return response.data;
  },
};
