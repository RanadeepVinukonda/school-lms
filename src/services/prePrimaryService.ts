import api from './api';
import type { ApiResponse } from '@/types';
import type { K2DashboardData, PrePrimaryLesson, FlashCard, Story, TracingActivity } from '@/types/prePrimary';

export const prePrimaryService = {
  async getDashboard(studentId: string) {
    const res = await api.get<ApiResponse<K2DashboardData>>(`/pre-primary/dashboard/${studentId}`);
    return res.data.data;
  },

  async getLessons() {
    const res = await api.get<ApiResponse<PrePrimaryLesson[]>>('/pre-primary/lessons');
    return res.data.data;
  },

  async getFlashcards(subjectId: string) {
    const res = await api.get<ApiResponse<FlashCard[]>>(`/pre-primary/flashcards/${subjectId}`);
    return res.data.data;
  },

  async getStories() {
    const res = await api.get<ApiResponse<Story[]>>('/pre-primary/stories');
    return res.data.data;
  },

  async saveTracing(data: { studentId: string; content: string; type: string; label?: string }) {
    const res = await api.post<ApiResponse<TracingActivity>>('/pre-primary/tracing/save', data);
    return res.data.data;
  },

  async updateProgress(studentId: string, data: { subject: string; completed: number; stars?: number }) {
    const res = await api.post<ApiResponse<unknown>>(`/pre-primary/progress/${studentId}`, data);
    return res.data.data;
  },
};
