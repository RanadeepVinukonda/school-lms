import api from './api';
import type { ApiResponse } from '@/types';

export interface TimetableEntry {
  id: string;
  class_id: string;
  day: string;
  period: number;
  subject_id?: string;
  subjectId?: string;
  teacher_id?: string;
  teacherId?: string;
  room?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  school_id?: string;
  classId?: string;
}

export const timetableService = {
  async getByClass(classId: string) {
    const response = await api.get<ApiResponse<TimetableEntry[]>>(`/timetable/class/${classId}`);
    return response.data;
  },

  async getBySchool(schoolId: string) {
    const response = await api.get<ApiResponse<TimetableEntry[]>>(`/timetable/school/${schoolId}`);
    return response.data;
  },

  async create(data: { classId: string; day: string; period: number; subjectId?: string; teacherId?: string; room?: string; startTime?: string; endTime?: string }) {
    const response = await api.post<ApiResponse<TimetableEntry>>('/timetable', data);
    return response.data;
  },

  async update(id: string, data: Record<string, unknown>) {
    const response = await api.put<ApiResponse<TimetableEntry>>(`/timetable/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete<ApiResponse<null>>(`/timetable/${id}`);
    return response.data;
  },

  async saveDay(data: { classId: string; day: string; periods: Array<{ period: number; subjectId?: string; teacherId?: string; room?: string; startTime?: string; endTime?: string }> }) {
    const response = await api.post<ApiResponse<TimetableEntry[]>>('/timetable/day', data);
    return response.data;
  },

  async getByClassAndDay(classId: string, day: string) {
    const response = await api.get<ApiResponse<TimetableEntry[]>>(`/timetable/class/${classId}/day/${day}`);
    return response.data;
  },
};
