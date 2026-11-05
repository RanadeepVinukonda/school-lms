export interface GradeSummary {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  currentGrade: number;
  letterGrade: string;
  totalPoints: number;
  earnedPoints: number;
  assignmentsCount: number;
  completedAssignments: number;
  quizzesCount: number;
  completedQuizzes: number;
  examsCount: number;
  completedExams: number;
  attendanceRate: number;
}

export interface GradeDetail {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  period: string;
  items: GradeItem[];
  overallScore: number;
  overallLetter: string;
  teacherNotes?: string;
}

export interface GradeItem {
  id: string;
  type: 'assignment' | 'quiz' | 'exam' | 'participation' | 'other';
  title: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
  date: string;
  feedback?: string;
}
