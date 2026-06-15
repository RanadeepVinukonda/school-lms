export interface VirtualLab {
  id: string;
  title: string;
  subject: 'physics' | 'chemistry' | 'biology';
  topic: string;
  description: string;
  type: 'circuit' | 'mechanics' | 'reaction' | 'cell' | 'custom';
  config: {
    elements: LabElement[];
    initialState: Record<string, unknown>;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  classIds: string[];
  createdAt: string;
  completed?: boolean;
}

export interface LabElement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

export interface LabProgress {
  id: string;
  studentId: string;
  labId: string;
  completed: boolean;
  completedAt: string;
  attempts: number;
  score: number;
}
