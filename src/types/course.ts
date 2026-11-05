export type CourseStatus = 'draft' | 'published' | 'archived';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classIds: string[];
  level: CourseLevel;
  status: CourseStatus;
  duration: number;
  totalModules: number;
  totalLessons: number;
  totalStudents: number;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: number;
  totalDuration: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  grade?: number;
}

export interface CourseFilters {
  search?: string;
  status?: CourseStatus;
  level?: CourseLevel;
  subjectId?: string;
  classId?: string;
  teacherId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
