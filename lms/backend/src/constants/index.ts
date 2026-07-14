export const TABLES = {
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  TEXTBOOKS: 'textbooks',
  GRADES: 'grades',
  ASSIGNMENTS: 'assignments',
  EXAMS: 'exams',
  QUIZZES: 'quizzes',
  TIMETABLE: 'timetable',
  NOTIFICATIONS: 'notifications',
  CHAPTERS: 'chapters',
  CONCEPTS: 'concepts',
  FIRESTORE_DOCS: 'firestore_docs',
} as const;

export const COLLECTIONS = {
  TEACHER_CLASS_SUBJECT: 'teacherClassSubject',
  ACADEMIC_YEARS: 'academicYears',
  SETTINGS: 'settings',
  COURSES: 'courses',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  GRADES: 'grades',
  TOKENS: 'tokens',
  REPORTS: 'reports',
  SENT_REMINDERS: 'sentReminders',
  ENROLLMENT: 'enrollment',
  EXAM_V2: 'examV2',
  EXAM_ATTEMPT_V2: 'examAttemptV2',
  QUIZ_ATTEMPTS: 'quizAttempts',
  EXAM_ATTEMPTS: 'examAttempts',
} as const;

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  READY: 'ready',
  ERROR: 'error',
  ABANDONED: 'abandoned',
} as const;

export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  PARENT: 'parent',
  SUPER_ADMIN: 'super_admin',
} as const;

export const TTL = {
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;
