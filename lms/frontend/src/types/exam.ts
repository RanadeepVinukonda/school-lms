export type ExamStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'graded';
export type ExamQuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'short_answer' | 'problem_solving';

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructions: string;
  duration: number;
  totalPoints: number;
  passingScore: number;
  questions: ExamQuestion[];
  status: ExamStatus;
  startDate: string;
  endDate: string;
  isProctored: boolean;
  shuffleQuestions: boolean;
  showResults: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  type: ExamQuestionType;
  text: string;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  rubric?: string;
  order: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, string | string[]>;
  score?: number;
  percentage?: number;
  passed?: boolean;
  status: 'in_progress' | 'submitted' | 'graded';
  timeSpent: number;
}
