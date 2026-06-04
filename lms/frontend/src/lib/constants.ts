import type { UserRole } from '@/types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  teacher: 60,
  student: 20,
  parent: 10,
};

export const ROUTES = {
  HOME: '/',
  WELCOME: '/welcome',
  LOGIN: '/login',
  LOGIN_STUDENT: '/login/student',
  LOGIN_TEACHER: '/login/teacher',
  LOGIN_ADMIN: '/login/admin',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_SUBJECTS: '/student/subjects',
  STUDENT_SUBJECT: (id: string) => `/student/subjects/${id}`,
  STUDENT_TEXTBOOK: (id: string) => `/student/textbooks/${id}`,
  STUDENT_LESSON: (id: string) => `/student/lessons/${id}`,
  STUDENT_EXAMS: '/student/exams',
  STUDENT_TASKS: '/student/tasks',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_PROFILE: '/student/profile',

  TEACHER_DASHBOARD: '/teacher/dashboard',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_STUDENT: (id: string) => `/teacher/students/${id}`,
  TEACHER_EXAMS: '/teacher/exams',
  TEACHER_EXAM_CORRECT: (id: string) => `/teacher/exams/${id}/correct`,
  TEACHER_TEXTBOOKS: '/teacher/textbooks',
  TEACHER_TEXTBOOK: (id: string) => `/teacher/textbooks/${id}`,
  TEACHER_PROFILE: '/teacher/profile',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_CLASS_TIMETABLE: (id: string) => `/admin/classes/${id}/timetable`,
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_USERS: '/admin/users',

  ASSIGNMENT_DETAIL: (id: string) => `/assignments/${id}`,
  QUIZ_ATTEMPT: (id: string) => `/quizzes/${id}/attempt`,
  EXAM_DETAIL: (id: string) => `/exams/${id}`,
  ABOUT: '/about',
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
