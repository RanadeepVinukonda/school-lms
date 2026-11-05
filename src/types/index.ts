import type { UserRole } from './auth';
export type { UserRole } from './auth';
export type { UserProfile, UserSettings } from './user';
export type { Subject } from './subject';
export type { Course, Module, Enrollment, CourseFilters, CourseStatus, CourseLevel, EnrollmentStatus } from './course';
export type { Lesson, LessonProgress, LessonResource, LessonType, ResourceType } from './lesson';
export type { Assignment, RubricCriteria, Submission, Grade as AssignmentGrade, AssignmentStatus, SubmissionStatus, GradeLevel } from './assignment';
export type { Class, Section, Schedule } from './class';
export type { Quiz, Question, QuizAttempt, QuizAnswer, QuestionType, QuizStatus } from './quiz';
export type { Exam, ExamQuestion, ExamAttempt, ExamStatus, ExamQuestionType } from './exam';
export type { GradeSummary, GradeDetail, GradeItem } from './grade';
export type { Message, Conversation } from './message';
export type { Notification, NotificationPreferences, NotificationType } from './notification';
export type { ApiResponse, PaginatedResponse, PaginationParams, ApiError } from './api';
export type { DashboardStats, PerformanceData, ChartData } from './analytics';
export type { Textbook, Chapter, Concept, CachedVideo, GeneratedQuestion, GeneratedAssignment, ConceptProgress } from './textbook';
export type { VirtualLab, LabElement, LabProgress } from './virtualLab';
export type { CodingProject, StreamProject, ProjectStep, CodeExecutionResult } from './coding';

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
  phone?: string;
  gender?: string;
  studentId?: string;
  classId?: string;
  rollNo?: number;
  academicYear?: string;
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

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}
