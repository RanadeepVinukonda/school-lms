import api from './api';
import type { ApiResponse } from '@/types';

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  alternateLink?: string;
}

export const classroomService = {
  async getCourses(accessToken: string) {
    const response = await api.get<ApiResponse<ClassroomCourse[]>>('/classroom/courses', {
      params: { accessToken }
    });
    return response.data;
  },

  async syncRoster(data: { classroomCourseId: string; targetClassId: string; accessToken: string }) {
    const response = await api.post<ApiResponse<{ success: boolean; count: number }>>('/classroom/sync-roster', data);
    return response.data;
  },

  async pushGrade(data: { classroomCourseId: string; courseWorkId: string; studentEmail: string; grade: number; accessToken: string }) {
    const response = await api.post<ApiResponse<{ success: boolean }>>('/classroom/push-grade', data);
    return response.data;
  },
};
