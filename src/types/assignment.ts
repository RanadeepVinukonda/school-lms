export type AssignmentStatus = 'draft' | 'published' | 'closed' | 'graded';
export type SubmissionStatus = 'draft' | 'submitted' | 'late' | 'graded';
export type GradeLevel = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Assignment {
  id: string;
  courseId: string;
  moduleId?: string;
  title: string;
  description: string;
  instructions: string;
  points: number;
  dueDate: string;
  status: AssignmentStatus;
  attachments: string[];
  allowLateSubmission: boolean;
  latePenalty: number;
  maxAttempts: number;
  rubric?: RubricCriteria[];
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
}

export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  studentName: string;
  content: string;
  attachments: string[];
  status: SubmissionStatus;
  attemptNumber: number;
  submittedAt: string;
  grade?: Grade;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export interface Grade {
  id: string;
  submissionId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  letter: GradeLevel;
  feedback: string;
  gradedBy: string;
  gradedAt: string;
}
