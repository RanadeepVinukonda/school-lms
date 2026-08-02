export interface Textbook {
  id: string;
  classId: string;
  subjectId: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  fileUrl?: string;
  chapters: Chapter[];
  chapterCount?: number;
  status: 'processing' | 'ready' | 'error' | 'failed';
  processingProgress: number;
  processingStage: string;
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string;
  logs?: string[];
  failureReason?: string | null;
  totalConcepts?: number;
  completedConcepts?: number;
}

export interface Chapter {
  id: string;
  textbookId: string;
  title: string;
  order: number;
  description?: string;
  concepts: Concept[];
}

export interface Concept {
  id: string;
  chapterId: string;
  textbookId: string;
  title: string;
  summary: string;
  notes: string;
  learningObjectives: string[];
  keyPoints?: string;
  formulas?: string;
  examples?: string;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  estimatedMinutes: number;
  videos: CachedVideo[];
  questionBank: GeneratedQuestion[];
  assignments: GeneratedAssignment[];
  order: number;
}

export interface CachedVideo {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  relevance: number;
}

export interface GeneratedQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer' | 'descriptive' | 'numerical' | 'scenario';
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'recall' | 'application' | 'critical_thinking';
  text: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  bloomLevel?: string;
  hots?: boolean;
  topic?: string;
  source?: string;
}

export interface GeneratedAssignment {
  id: string;
  title: string;
  instructions: string;
  marks: number;
  estimatedMinutes: number;
  answerKey: string;
  rubric: string;
  type: 'homework' | 'worksheet' | 'challenge' | 'project';
}

export interface ConceptRelease {
  id: string;
  textbookId: string;
  chapterId: string;
  conceptId: string;
  teacherId: string;
  questionBankReleased: boolean;
  assignmentsReleased: boolean;
  mindMapReleased?: boolean;
  updatedAt: string;
}

export interface ConceptProgress {
  userId: string;
  conceptId: string;
  quizScores: number[];
  quizAttempts: number;
  timeSpentMinutes: number;
  lessonCompleted: boolean;
  videoCompleted: boolean;
  videoPosition: number;
  practiceCompleted: boolean;
  questionAccuracy: number;
  assignmentScores: number[];
  masteryPercentage: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  lastAccessed: string;
}
