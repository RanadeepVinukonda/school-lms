import type { UserRole } from '@/types';
import { Capacitor } from '@capacitor/core';

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
  STUDENT_AI_TUTOR: '/student/ai-tutor',
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
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_MINDMAP: '/teacher/mindmap',
  TEACHER_OCR: '/teacher/ocr',
  TEACHER_UNIFIED_TEST: '/teacher/unified-test',

  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_CLASSES: '/admin/classes',
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_USERS: '/admin/users',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_SCHOOL_ANALYTICS: '/admin/school-analytics',
  ADMIN_ATTENDANCE: '/admin/attendance',
  ADMIN_FEE: '/admin/fee',
  ADMIN_TIMETABLE: '/admin/timetable',
  ADMIN_NOTICEBOARD: '/admin/noticeboard',
  ADMIN_ERP_DASHBOARD: '/admin/erp',
  TEACHER_TIMETABLE: '/teacher/timetable',
  TEACHER_REWARDS: '/teacher/rewards',
  TEACHER_REPORT: '/teacher/report',
  STUDENT_REPORT: '/student/report',
  PARENT_REPORT: '/parent/report',
  ADMIN_REPORTS: '/admin/reports',
  TEACHER_CODING: '/teacher/coding',
  TEACHER_CODING_EDITOR: (id: string) => `/teacher/coding/${id}`,
  TEACHER_NOTICEBOARD: '/teacher/noticeboard',
  STUDENT_NOTICEBOARD: '/student/noticeboard',

  ASSIGNMENT_DETAIL: (id: string) => `/assignments/${id}`,
  QUIZ_ATTEMPT: (id: string) => `/quizzes/${id}/attempt`,
  EXAM_DETAIL: (id: string) => `/exams/${id}`,
  STUDENT_TAKE_ASSESSMENT: (id: string) => `/student/assessments/${id}/take`,
  NOTIFICATIONS: '/notifications',
  ABOUT: '/about',

  STUDENT_GAMIFICATION: '/student/gamification',
  STUDENT_LEADERBOARD: '/student/leaderboard',
  STUDENT_ROLL_NUMBER: '/student/roll-number',
  TEACHER_SELECT_CLASS: '/teacher/select-class',

  PARENT_DASHBOARD: '/parent/dashboard',
  PARENT_CHILDREN: '/parent/children',
  PARENT_CHILD: (id: string) => `/parent/children/${id}`,
  PARENT_REPORTS: '/parent/reports',
  PARENT_PROFILE: '/parent/profile',
  PARENT_PROFILE_EDIT: '/parent/profile/edit',
  PARENT_NOTICEBOARD: '/parent/noticeboard',

  STUDENT_CODING: '/student/coding',
  STUDENT_CODING_EDITOR: (id: string) => `/student/coding/${id}`,
  STUDENT_MINDMAPS: '/student/mindmaps',
  STUDENT_OCR: '/student/ocr',
  STUDENT_ADAPTIVE_QUIZ: (conceptId: string) => `/student/concepts/${conceptId}/adaptive-quiz`,
  TEACHER_NEP_QUESTIONS: '/teacher/nep-questions',
  TEACHER_RUBRICS: '/teacher/rubrics',
  STUDENT_RESOURCES: '/student/resources',
  TEACHER_RESOURCE_REQUESTS: '/teacher/resource-requests',
  K2_DASHBOARD: '/k2/dashboard',
  K2_TRACING: '/k2/tracing',
  K2_PHONICS: '/k2/phonics',
  K2_STORIES: '/k2/stories',
  K2_FLASHCARDS: '/k2/flashcards',
  K2_FLASHCARD_CATEGORY: (category: string) => `/k2/flashcards/${category}`,
} as const;

// Native app: the WebView loads the deployed site, so relative /api goes through
// the same-origin Vercel proxy (vercel.json) to Render. That makes the csrf-token
// and session cookies first-party, which the Android WebView stores reliably.
// (Cross-origin direct-to-Render calls rely on third-party cookies, which WebViews
// often drop — that caused every create/edit to fail with a CSRF 403.)
export const API_BASE_URL =
  import.meta.env.DEV === false && Capacitor.isNativePlatform()
    ? '/api'
    : import.meta.env.VITE_API_BASE_URL || '/api';

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
