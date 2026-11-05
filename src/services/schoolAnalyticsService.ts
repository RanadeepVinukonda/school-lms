import api from './api';
import type { ApiResponse } from '@/types';

export interface GradeComparisonItem {
  grade: string;
  averageScore: number;
  studentCount: number;
  totalPoints: number;
}

export interface TeacherComparisonItem {
  teacherId: string;
  teacherName: string;
  averageScore: number;
  studentCount: number;
  classCount: number;
}

export interface ClassComparisonItem {
  classId: string;
  className: string;
  grade: string;
  averageScore: number;
  studentCount: number;
}

export interface SchoolOverview {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  averagePerformance: number;
  atRiskCount: number;
  totalGrades: number;
}

export interface TrendItem {
  month: string;
  averageScore: number;
  count: number;
}

export const schoolAnalyticsService = {
  async getGradeComparison() {
    const response = await api.get<ApiResponse<GradeComparisonItem[]>>('/school-analytics/grade-comparison');
    return response.data;
  },

  async getTeacherComparison() {
    const response = await api.get<ApiResponse<TeacherComparisonItem[]>>('/school-analytics/teacher-comparison');
    return response.data;
  },

  async getClassComparison() {
    const response = await api.get<ApiResponse<ClassComparisonItem[]>>('/school-analytics/class-comparison');
    return response.data;
  },

  async getSchoolOverview() {
    const response = await api.get<ApiResponse<SchoolOverview>>('/school-analytics/overview');
    return response.data;
  },

  async getPerformanceTrends() {
    const response = await api.get<ApiResponse<TrendItem[]>>('/school-analytics/trends');
    return response.data;
  },
};
