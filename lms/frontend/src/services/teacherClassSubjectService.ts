import api from './api';
import type { ApiResponse } from '@/types';

export interface TeacherClassSubject {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  textbookId?: string;
  createdAt?: string;
  updatedAt?: string;
  teacherName?: string;
  className?: string;
  subjectName?: string;
}

export const teacherClassSubjectService = {
  /** Assign a teacher to a (class × subject). Enforces one teacher per subject per class. */
  async assign(data: { teacherId: string; classId: string; subjectId: string }) {
    const response = await api.post<ApiResponse<TeacherClassSubject>>('/teacher-class-subject/assign', data);
    return response.data;
  },

  /** Get all assignments for the currently logged-in teacher. */
  async getMyAssignments() {
    const response = await api.get<ApiResponse<TeacherClassSubject[]>>('/teacher-class-subject/my');
    return response.data;
  },

  /** Get assignment for class for the current teacher. */
  async getAssignmentForClass(classId: string) {
    const response = await api.get<ApiResponse<TeacherClassSubject>>(`/teacher-class-subject/my/class/${classId}`);
    return response.data;
  },

  /** Get all assignments for a class with teacher names (students). */
  async getClassAssignments(classId: string) {
    const response = await api.get<ApiResponse<TeacherClassSubject[]>>(`/teacher-class-subject/class/${classId}`);
    return response.data.data;
  },

  /** Get unassigned subjects for a class. */
  async getUnassigned(classId: string) {
    const response = await api.get<ApiResponse<any[]>>(`/teacher-class-subject/unassigned/${classId}`);
    return response.data;
  },

  /** Get all assignments with resolved names (admin only). */
  async getAll() {
    const response = await api.get<ApiResponse<TeacherClassSubject[]>>('/teacher-class-subject/all');
    return response.data;
  },

  /** Remove a teacher assignment. */
  async remove(assignmentId: string) {
    const response = await api.delete<ApiResponse<void>>(`/teacher-class-subject/${assignmentId}`);
    return response.data;
  },
};
