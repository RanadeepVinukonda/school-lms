export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin' | 'parent';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  thumbnail?: string;
  color: string;
  rating: number;
  studentsCount: number;
  modules: CourseModule[];
  lessonsCount: number;
  totalTime: number;
  assignmentsCount: number;
  quizzesCount: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  content: string;
  videoUrl?: string;
  attachments: Attachment[];
  duration: number;
  order: number;
  type: 'video' | 'document' | 'quiz';
  isBookmarked?: boolean;
  completionStatus?: 'pending' | 'completed' | 'locked';
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  instructions: string;
  dueDate: Date;
  maxPoints: number;
  attachments: Attachment[];
  allowResubmission: boolean;
  rubric?: RubricCriterion[];
  status: 'draft' | 'published' | 'closed';
  createdAt: Date;
}

export interface RubricCriterion {
  id: string;
  name: string;
  maxPoints: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  content?: string;
  files: Attachment[];
  submittedAt: Date;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: Date;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  timeLimit: number;
  passingScore: number;
  shuffleQuestions: boolean;
  questions: Question[];
  status: 'draft' | 'published';
  createdAt: Date;
}

export interface Exam extends Quiz {
  requiresFullscreen: boolean;
  autoSubmit: boolean;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  order: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, string | string[]>;
  score?: number;
  totalPoints: number;
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  submittedAt?: Date;
}

export interface Grade {
  id: string;
  courseId: string;
  userId: string;
  type: 'assignment' | 'quiz' | 'exam';
  itemId: string;
  itemName: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments: Attachment[];
  readAt?: Date;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: { id: string; name: string; avatar?: string }[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'announcement' | 'grade' | 'assignment' | 'message' | 'system';
  read: boolean;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  courseId?: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: Date;
}

export interface Bookmark {
  id: string;
  userId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface ApiError {
  code?: string;
  message: string;
  status?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  activeUsers: number;
}

export interface PerformanceData {
  labels: string[];
  values: number[];
}

export interface CourseFilters {
  search?: string;
  subject?: string;
  status?: string;
  sortBy?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  progress: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  answers: Record<string, string>;
  score?: number;
  totalPoints: number;
  status: 'in_progress' | 'submitted' | 'timed_out';
  startedAt: Date;
  submittedAt?: Date;
}

export interface GradeDetail {
  id: string;
  courseId: string;
  userId: string;
  type: 'assignment' | 'quiz' | 'exam';
  itemId: string;
  itemName: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradedAt: Date;
}

export interface GradeSummary {
  courseId: string;
  courseName: string;
  average: number;
  letterGrade: string;
}

export interface LessonProgress {
  lessonId: string;
  status: 'pending' | 'completed' | 'locked';
  completedAt?: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  types: string[];
}
