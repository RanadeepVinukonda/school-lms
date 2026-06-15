import type { UserRole } from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '/api';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 20,
  parent: 10,
};

export const ROUTE_NAMES = {
  AUTH: 'Auth',
  LOGIN: 'Login',
  FORGOT_PASSWORD: 'ForgotPassword',
  STUDENT: 'Student',
  STUDENT_DASHBOARD: 'StudentDashboard',
  STUDENT_TASKS: 'StudentTasks',
  STUDENT_EXAMS: 'StudentExams',
  TEACHER: 'Teacher',
  TEACHER_DASHBOARD: 'TeacherDashboard',
  ADMIN: 'Admin',
  ADMIN_DASHBOARD: 'AdminDashboard',
  NOT_FOUND: 'NotFound',
} as const;

export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return ROUTE_NAMES.ADMIN_DASHBOARD;
    case 'teacher':
      return ROUTE_NAMES.TEACHER_DASHBOARD;
    case 'student':
    default:
      return ROUTE_NAMES.STUDENT_DASHBOARD;
  }
}
