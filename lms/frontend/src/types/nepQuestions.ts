export type NEPQuestionType = 'olympiad' | 'competency' | 'viva';

export interface NEPQuestion {
  id: string;
  conceptId: string;
  type: NEPQuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  competencyArea?: string;
}

export interface RubricCriterion {
  name: string;
  description: string;
  maxMarks: number;
  levels: { label: string; marks: number; description: string }[];
}

export interface GradingRubric {
  id: string;
  assignmentId: string;
  title: string;
  criteria: RubricCriterion[];
  totalMarks: number;
  generatedAt: string;
  createdAt?: string;
}

export interface FeedbackSummary {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallScore: number;
  grade: string;
}
