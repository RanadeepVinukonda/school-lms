import api from './api';
import type { ApiResponse, DashboardStats, PerformanceData } from '@/types';

/** API service for analytics and dashboard stats. */
export const analyticsService = {
  /** Fetch dashboard statistics for the current user. */
  async getDashboardStats() {
    const response = await api.get<ApiResponse<DashboardStats>>('/analytics/dashboard');
    return response.data;
  },

  /** Fetch performance data for a specific course. */
  async getCoursePerformance(courseId: string) {
    const response = await api.get<ApiResponse<PerformanceData>>(`/analytics/courses/${courseId}/performance`);
    return response.data;
  },

  /** Fetch performance data for a specific student. */
  async getStudentPerformance(studentId: string) {
    const response = await api.get<ApiResponse<PerformanceData>>(`/analytics/students/${studentId}/performance`);
    return response.data;
  },

  /** Fetch grade distribution data, optionally filtered by course. */
  async getGradeDistribution(courseId?: string) {
    const response = await api.get<ApiResponse<{ name: string; value: number }[]>>('/analytics/grade-distribution', {
      params: { courseId },
    });
    return response.data;
  },

  /** Fetch enrollment trends over time. */
  async getEnrollmentTrends() {
    const response = await api.get<ApiResponse<PerformanceData>>('/analytics/enrollment-trends');
    return response.data;
  },

  /** Fetch concept oversight data (Admin). */
  async getConceptOversight() {
    const response = await api.get<ApiResponse<any[]>>('/analytics-v2/oversight');
    return response.data.data;
  },

  /** Send re-teach notification to a teacher (Admin). */
  async requestReTeach(data: { teacherId: string; className: string; subjectName: string; conceptName: string }) {
    const response = await api.post<ApiResponse<void>>('/analytics-v2/re-teach', data);
    return response.data;
  },
};
