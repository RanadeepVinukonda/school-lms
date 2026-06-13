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
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_SUBJECTS: '/student/subjects',
  STUDENT_SUBJECT: (id: string) => `/student/subjects/${id}`,
  STUDENT_TEXTBOOK: (id: string) => `/student/textbooks/${id}`,
  STUDENT_CHAPTER: (textbookId: string, chapterId: string) => `/student/chapters/${textbookId}/${chapterId}`,
  STUDENT_CONCEPT: (conceptId: string) => `/student/concepts/${conceptId}`,
  STUDENT_CONCEPT_QUIZ: (conceptId: string) => `/student/concepts/${conceptId}/quiz`,
  STUDENT_LESSON: (id: string) => `/student/lessons/${id}`,
  STUDENT_EXAMS: '/student/exams',
  STUDENT_TASKS: '/student/tasks',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_PROFILE: '/student/profile',
  STUDENT_PROFILE_EDIT: '/student/profile/edit',

  TEACHER_DASHBOARD: '/teacher/dashboard',
  TEACHER_CLASS: (id: string) => `/teacher/classes/${id}`,
  TEACHER_SUBJECT: (classId: string, subjectId: string) => `/teacher/classes/${classId}/subjects/${subjectId}`,
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_STUDENT: (id: string) => `/teacher/students/${id}`,
  TEACHER_EXAMS: '/teacher/exams',
  TEACHER_EXAM_CORRECT: (id: string) => `/teacher/exams/${id}/correct`,
  TEACHER_TEXTBOOKS: '/teacher/textbooks',
  TEACHER_TEXTBOOK: (id: string) => `/teacher/textbooks/${id}`,
  TEACHER_TEXTBOOK_UPLOAD: '/teacher/textbooks/upload',
  TEACHER_CONCEPT: (textbookId: string, chapterId: string, conceptId: string) =>
    `/teacher/textbooks/${textbookId}/chapters/${chapterId}/concepts/${conceptId}`,
  TEACHER_PROFILE: '/teacher/profile',
  TEACHER_ASSESSMENTS: '/teacher/assessments',
  TEACHER_EXAM_CREATE: '/teacher/exams/create',
  TEACHER_PROFILE_EDIT: '/teacher/profile/edit',
  TEACHER_VIDEOS: '/teacher/videos',
  TEACHER_ANALYTICS: '/teacher/analytics',
  TEACHER_RESULTS_PUSH: '/teacher/release-grades',
  TEACHER_QUESTION_BANK: '/teacher/question-bank',
  TEACHER_QUESTION_PAPERS: '/teacher/question-papers',
  TEACHER_TEST_TEMPLATES: '/teacher/test-templates',
  TEACHER_TEST_SCHEDULE: '/teacher/test-schedule',
  TEACHER_PYQ: '/teacher/pyq',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_ACADEMIC_YEARS: '/admin/academic-years',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_USERS: '/admin/users',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',

  ASSIGNMENT_DETAIL: (id: string) => `/assignments/${id}`,
  QUIZ_ATTEMPT: (id: string) => `/quizzes/${id}/attempt`,
  EXAM_DETAIL: (id: string) => `/exams/${id}`,
  STUDENT_TAKE_ASSESSMENT: (id: string) => `/student/assessments/${id}/take`,
  NOTIFICATIONS: '/notifications',
  ABOUT: '/about',

  STUDENT_ROLL_NUMBER: '/student/roll-number',
  TEACHER_SELECT_CLASS: '/teacher/select-class',
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
