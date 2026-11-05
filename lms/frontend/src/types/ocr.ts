export interface OCRBlock {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
}

export interface GeneratedQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching' | 'descriptive';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
  bloomLevel?: string;
  hots?: boolean;
  source?: string;
}

export interface OCRMappingResult {
  conceptId: string;
  conceptName: string;
  questions?: GeneratedQuestion[];
  assignment?: {
    id: string;
    title: string;
    description: string;
    instructions: string;
    questions: string[];
    totalPoints: number;
    rubric: string;
  };
  type?: 'quiz' | 'assignment';
}

export interface ConceptOption {
  id: string;
  chapterId: string;
  chapterTitle: string;
  title: string;
  summary: string;
}
