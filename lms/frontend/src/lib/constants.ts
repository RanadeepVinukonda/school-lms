import type { UserRole } from '@/types';

export const ROLES: Record<string, UserRole> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 20,
  parent: 10,
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  COURSES: '/courses',
  COURSE_DETAIL: (id: string) => `/courses/${id}`,
  COURSE_LESSON: (courseId: string, lessonId: string) =>
    `/courses/${courseId}/lessons/${lessonId}`,
  MODULES: (courseId: string) => `/courses/${courseId}/modules`,
  ASSIGNMENTS: '/assignments',
  ASSIGNMENT_DETAIL: (id: string) => `/assignments/${id}`,
  QUIZZES: '/quizzes',
  QUIZ_DETAIL: (id: string) => `/quizzes/${id}`,
  QUIZ_ATTEMPT: (id: string) => `/quizzes/${id}/attempt`,
  EXAMS: '/exams',
  EXAM_DETAIL: (id: string) => `/exams/${id}`,
  GRADES: '/grades',
  MESSAGES: '/messages',
  CONVERSATION: (id: string) => `/messages/${id}`,
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  USERS: '/users',
  USER_DETAIL: (id: string) => `/users/${id}`,
  CLASSES: '/classes',
  CLASS_DETAIL: (id: string) => `/classes/${id}`,
  SUBJECTS: '/subjects',
  ANALYTICS: '/analytics',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SETTINGS: '/admin/settings',
} as const;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
};

export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/webm'],
    all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  },
} as const;

export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const HEADER_HEIGHT = 64;
export const MOBILE_BREAKPOINT = 768;
