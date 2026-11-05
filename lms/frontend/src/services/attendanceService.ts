import api from './api';
import type { ApiResponse } from '@/types';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'holiday';
  markedBy: string;
  markedAt: string;
  note?: string;
}

export interface AttendanceReport {
  records: AttendanceRecord[];
  summary: Record<string, { present: number; absent: number; late: number; holiday: number; total: number; percentage?: number }>;
  yearStart: string | null;
}

export const attendanceService = {
  async markAttendance(data: { studentIds: string[]; classId: string; date: string; status: AttendanceRecord['status']; markedBy: string; note?: string }) {
    const response = await api.post<ApiResponse<AttendanceRecord[]>>('/attendance/mark', data);
    return response.data;
  },

  async getClassAttendance(classId: string, date?: string) {
    const response = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance/class/${classId}`, { params: { date } });
    return response.data;
  },

  async getStudentAttendance(studentId: string) {
    const response = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance/student/${studentId}`);
    return response.data;
  },

  async getAttendanceReport(classId: string) {
    const response = await api.get<ApiResponse<AttendanceReport>>(`/attendance/report/${classId}`);
    return response.data;
  },

  async exportAttendanceCSV(classId: string) {
    const response = await api.get(`/attendance/export/${classId}`, { responseType: 'blob' });
    return response.data;
  },
};
