export interface K2Profile {
  id: string;
  displayName: string;
  classId: string;
  level: string;
}

export interface K2DashboardData {
  profile: K2Profile;
  progress: Record<string, number>;
  totalStars: number;
}

export interface PrePrimaryLesson {
  id: string;
  title: string;
  description: string;
  type: 'visual' | 'phonics' | 'stories';
  thumbnail?: string;
  content?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashCard {
  id: string;
  subjectId: string;
  frontText: string;
  frontImage?: string;
  backText: string;
  backDescription?: string;
  audioUrl?: string;
  category: string;
}

export interface Story {
  id: string;
  title: string;
  pages: StoryPage[];
  audioUrl?: string;
  questions: StoryQuestion[];
  order: number;
  createdAt: string;
}

export interface StoryPage {
  image: string;
  text: string;
  pageNumber: number;
}

export interface StoryQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TracingActivity {
  id: string;
  studentId: string;
  content: string;
  type: string;
  label?: string;
  createdAt: string;
}
