import api from './api';
import type { ApiResponse, Lesson, LessonProgress, PaginatedResponse } from '@/types';

export const lessonService = {
  async getByModule(moduleId: string) {
    const response = await api.get<ApiResponse<Lesson[]>>(`/modules/${moduleId}/lessons`);
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get<ApiResponse<Lesson>>(`/lessons/${id}`);
    return response.data;
  },

  async create(data: Partial<Lesson>) {
    const response = await api.post<ApiResponse<Lesson>>('/lessons', data);
    return response.data;
  },

  async update(id: string, data: Partial<Lesson>) {
    const response = await api.put<ApiResponse<Lesson>>(`/lessons/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<void>>(`/lessons/${id}`);
    return response.data;
  },

  async markComplete(lessonId: string) {
    const response = await api.post<ApiResponse<LessonProgress>>(`/lessons/${lessonId}/complete`);
    return response.data;
  },

  async getProgress(courseId: string) {
    const response = await api.get<ApiResponse<LessonProgress[]>>(`/courses/${courseId}/progress`);
    return response.data;
  },
};
