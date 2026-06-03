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
  WELCOME: '/welcome',
  LOGIN: '/login',
  LOGIN_STUDENT: '/login/student',
  LOGIN_TEACHER: '/login/teacher',
  LOGIN_ADMIN: '/login/admin',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',

  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_SUBJECTS: '/student/subjects',
  STUDENT_SUBJECT: (id: string) => `/student/subjects/${id}`,
  STUDENT_EXAMS: '/student/exams',
  STUDENT_EXAM_CORRECTION: (id: string) => `/student/exams/${id}/correction`,
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_PROFILE: '/student/profile',

  TEACHER_DASHBOARD: '/teacher/dashboard',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_STUDENT: (id: string) => `/teacher/students/${id}`,
  TEACHER_EXAMS: '/teacher/exams',
  TEACHER_EXAM_CORRECT: (id: string) => `/teacher/exams/${id}/correct`,
  TEACHER_CLASSES: '/teacher/classes',
  TEACHER_TEXTBOOKS: '/teacher/textbooks',
  TEACHER_TEXTBOOK_CREATE: '/teacher/textbooks/create',
  TEACHER_TEXTBOOK: (id: string) => `/teacher/textbooks/${id}`,
  TEACHER_PROFILE: '/teacher/profile',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_CLASS_TIMETABLE: (id: string) => `/admin/classes/${id}/timetable`,
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_SETTINGS: '/admin/settings',

  COURSES: '/courses',
  COURSE_DETAIL: (id: string) => `/courses/${id}`,
  COURSE_LESSON: (courseId: string, lessonId: string) => `/courses/${courseId}/lessons/${lessonId}`,
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
  MY_COURSES: '/my-courses',
  COURSE_MANAGE: (id: string) => `/courses/${id}/manage`,
  LESSON_BUILDER: (courseId: string) => `/courses/${courseId}/lessons/create`,
  ASSIGNMENT_BUILDER: (courseId: string) => `/courses/${courseId}/assignments/create`,
  QUIZ_BUILDER: (courseId: string) => `/courses/${courseId}/quizzes/create`,
  GRADEBOOK: (courseId: string) => `/courses/${courseId}/gradebook`,
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
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
