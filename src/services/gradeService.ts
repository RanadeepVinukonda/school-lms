import api from './api';
import type { ApiResponse, GradeDetail, GradeSummary } from '@/types';

/** API service for accessing grade summaries and details. */
export const gradeService = {
  /** Fetch grade summary for the current student. */
  async getSummary() {
    const response = await api.get<ApiResponse<GradeSummary[]>>('/grades/summary');
    return response.data;
  },

  /** Fetch detailed grades for a specific course. */
  async getByCourse(courseId: string) {
    const response = await api.get<ApiResponse<GradeDetail>>(`/grades/courses/${courseId}`);
    return response.data;
  },

  /** Fetch all grade records. */
  async getAll() {
    const response = await api.get<ApiResponse<GradeDetail[]>>('/grades');
    return response.data;
  },

  /** Export grades as a CSV blob, optionally filtered by course. */
  async exportCsv(courseId?: string) {
    const response = await api.get('/grades/export', {
      params: { courseId },
      responseType: 'blob',
    });
    return response.data;
  },
};
