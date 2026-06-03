import api from './api';
import type { ApiResponse, DashboardStats, PerformanceData } from '@/types';

export const analyticsService = {
  async getDashboardStats() {
    const response = await api.get<ApiResponse<DashboardStats>>('/analytics/dashboard');
    return response.data;
  },

  async getCoursePerformance(courseId: string) {
    const response = await api.get<ApiResponse<PerformanceData>>(`/analytics/courses/${courseId}/performance`);
    return response.data;
  },

  async getStudentPerformance(studentId: string) {
    const response = await api.get<ApiResponse<PerformanceData>>(`/analytics/students/${studentId}/performance`);
    return response.data;
  },

  async getGradeDistribution(courseId?: string) {
    const response = await api.get<ApiResponse<{ name: string; value: number }[]>>('/analytics/grade-distribution', {
      params: { courseId },
    });
    return response.data;
  },

  async getEnrollmentTrends() {
    const response = await api.get<ApiResponse<PerformanceData>>('/analytics/enrollment-trends');
    return response.data;
  },
};
