/**
 * Notification type → category → Android channel mappings.
 *
 * Every notification `type` string produced anywhere in the codebase is mapped
 * to one of the canonical categories below. Each category corresponds to an
 * Android notification channel (created on-device by the app) and to a row in
 * the `notification_preferences` table so users can toggle delivery per type.
 */

export const CATEGORIES = [
  'assignments',
  'homework',
  'attendance',
  'exams',
  'results',
  'quizzes',
  'submissions',
  'evaluations',
  'announcements',
  'messages',
  'notice',
  'timetable',
  'mindmaps',
  'ocr',
  'adaptive',
  'ai',
  'skill',
  'parent',
  'teacher',
  'admin',
  'fee',
  'performance',
  'certificates',
  'login',
  'security',
  'reports',
  'system',
  'general',
] as const;

export type NotificationCategory = (typeof CATEGORIES)[number];

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  // assignments
  assignment: 'assignments',
  assignments: 'assignments',
  assignment_created: 'assignments',
  assignment_graded: 'assignments',
  assignment_due: 'assignments',
  assignment_updated: 'assignments',
  assignment_draft: 'assignments',
  submission_graded: 'assignments',
  // homework
  homework: 'homework',
  homework_due: 'homework',
  homework_created: 'homework',
  // attendance
  attendance: 'attendance',
  attendance_marked: 'attendance',
  attendance_update: 'attendance',
  // exams
  exam: 'exams',
  exam_published: 'exams',
  exam_scheduled: 'exams',
  exam_reminder: 'exams',
  exam_released: 'exams',
  test: 'exams',
  test_published: 'exams',
  test_scheduled: 'exams',
  test_overdue: 'exams',
  test_submitted: 'exams',
  exam_result: 'results',
  exam_results: 'results',
  // results & grades
  result: 'results',
  results: 'results',
  grade: 'results',
  grades: 'results',
  report_card: 'results',
  report_card_issued: 'results',
  grade_released: 'results',
  marks: 'results',
  // quizzes
  quiz: 'quizzes',
  quiz_published: 'quizzes',
  quiz_graded: 'quizzes',
  quiz_released: 'quizzes',
  concept_quizzes: 'quizzes',
  quiz_score: 'results',
  // submissions
  submission: 'submissions',
  submissions: 'submissions',
  quiz_submission: 'submissions',
  assignment_submission: 'submissions',
  // evaluations
  evaluation: 'evaluations',
  evaluations: 'evaluations',
  ai_grade: 'evaluations',
  grading: 'evaluations',
  feedback: 'evaluations',
  // announcements
  announcement: 'announcements',
  announcements: 'announcements',
  announcement_created: 'announcements',
  content_published: 'announcements',
  news: 'announcements',
  new_content: 'announcements',
  // messages
  message: 'messages',
  messages: 'messages',
  chat: 'messages',
  dm: 'messages',
  reply: 'messages',
  // notices
  notice: 'notice',
  notices: 'notice',
  notice_published: 'notice',
  // timetable
  timetable: 'timetable',
  timetable_update: 'timetable',
  schedule_change: 'timetable',
  // mindmaps
  mindmap: 'mindmaps',
  mindmaps: 'mindmaps',
  mindmap_shared: 'mindmaps',
  mindmap_updated: 'mindmaps',
  // ocr
  ocr: 'ocr',
  ocr_scan: 'ocr',
  ocr_complete: 'ocr',
  ocr_scan_result: 'ocr',
  // adaptive learning
  adaptive: 'adaptive',
  adaptive_path: 'adaptive',
  re_teach: 'adaptive',
  remediation: 'adaptive',
  concept: 'adaptive',
  concept_review: 'adaptive',
  personalized: 'adaptive',
  resource_request: 'adaptive',
  resource_approved: 'adaptive',
  resource_declined: 'adaptive',
  resource_pushed: 'adaptive',
  // ai / recommendations
  ai: 'ai',
  ai_tutor: 'ai',
  ai_recommendation: 'ai',
  recommendation: 'ai',
  recommendations: 'ai',
  tutor: 'ai',
  tutor_reply: 'ai',
  chat_ai: 'ai',
  suggestion: 'ai',
  // skill & gamification
  skill: 'skill',
  skill_mastered: 'skill',
  skills: 'skill',
  achievement: 'skill',
  achievements: 'skill',
  badge: 'skill',
  coin: 'skill',
  coins: 'skill',
  streak: 'skill',
  xp: 'skill',
  gamification: 'skill',
  challenges: 'skill',
  challenge: 'skill',
  daily_challenges: 'skill',
  perfect_score: 'skill',
  perfect_scores: 'skill',
  quiz_accuracy: 'skill',
  study_time: 'skill',
  concept_mastery: 'skill',
  // parent
  parent: 'parent',
  guardian: 'parent',
  parent_update: 'parent',
  // teacher
  teacher: 'teacher',
  teacher_message: 'teacher',
  // admin
  admin: 'admin',
  admin_alert: 'admin',
  // fee
  fee: 'fee',
  fees: 'fee',
  fee_reminder: 'fee',
  fee_due: 'fee',
  fee_paid: 'fee',
  payment: 'fee',
  invoice: 'fee',
  // performance
  performance: 'performance',
  performance_update: 'performance',
  progress: 'performance',
  progress_report: 'performance',
  // certificates
  certificate: 'certificates',
  certificate_issued: 'certificates',
  // login & security
  login: 'login',
  signin: 'login',
  new_login: 'login',
  security: 'security',
  security_alert: 'security',
  warning: 'security',
  apiKey: 'security',
  api_key: 'security',
  // reports
  report: 'reports',
  report_generated: 'reports',
  report_feedback: 'reports',
  weekly_report: 'reports',
  monthly_report: 'reports',
  // system
  system: 'system',
  info: 'system',
  welcome: 'system',
  registration: 'system',
  auto: 'system',
  client_credentials: 'system',
  service: 'system',
  maintenance: 'system',
  // general fallback bucket
  general: 'general',
};

/** Map any notification type string to its canonical category (defaults to 'general'). */
export function typeToCategory(type: string): NotificationCategory {
  const normalized = (type || '').trim().toLowerCase();
  return TYPE_TO_CATEGORY[normalized] || 'general';
}

/** Category name doubles as the Android channel id and pref key. */
export function categoryToChannelId(category: string): string {
  return category || 'general';
}

/** FCM collapse/tag key — collapses duplicate notifications for the same event. */
export function collapseKeyFor(type: string, entityId?: string | number | null): string | undefined {
  if (entityId === undefined || entityId === null) return undefined;
  return `g:${typeToCategory(type)}:${String(entityId)}`;
}
