import api from './api';
import type { ApiResponse, GradeDetail, GradeSummary } from '@/types';

export const gradeService = {
  async getSummary() {
    const response = await api.get<ApiResponse<GradeSummary[]>>('/grades/summary');
    return response.data;
  },

  async getByCourse(courseId: string) {
    const response = await api.get<ApiResponse<GradeDetail>>(`/grades/courses/${courseId}`);
    return response.data;
  },

  async getAll() {
    const response = await api.get<ApiResponse<GradeDetail[]>>('/grades');
    return response.data;
  },

  async exportCsv(courseId?: string) {
    const response = await api.get('/grades/export', {
      params: { courseId },
      responseType: 'blob',
    });
    return response.data;
  },
};
