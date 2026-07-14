export type LessonType = 'video' | 'document' | 'quiz' | 'assignment';
export type ResourceType = 'pdf' | 'video' | 'link' | 'file' | 'image';

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  type: LessonType;
  order: number;
  duration: number;
  videoUrl?: string;
  resources: LessonResource[];
  isPublished: boolean;
  isFree: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  timeSpent: number;
  score?: number;
  lastAccessedAt: string;
  completedAt?: string;
}

export interface LessonResource {
  id: string;
  lessonId: string;
  title: string;
  type: ResourceType;
  url: string;
  size?: number;
  duration?: number;
}
