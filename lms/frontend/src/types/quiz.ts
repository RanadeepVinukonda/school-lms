export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching';
export type QuizStatus = 'draft' | 'published' | 'closed';

export interface Quiz {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  instructions: string;
  timeLimit: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResults: boolean;
  questions: Question[];
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  order: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  answers: QuizAnswer[];
  score?: number;
  totalPoints: number;
  percentage?: number;
  passed?: boolean;
  attemptNumber: number;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  pointsEarned?: number;
}
