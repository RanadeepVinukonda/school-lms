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
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OCRMappingResult {
  conceptId: string;
  conceptName: string;
  questions: GeneratedQuestion[];
}

export interface ConceptOption {
  id: string;
  chapterId: string;
  chapterTitle: string;
  title: string;
  summary: string;
}
