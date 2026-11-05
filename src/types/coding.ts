export interface CodingProject {
  id: string;
  title: string;
  language: 'javascript' | 'python' | 'html';
  code: string;
  ownerId: string;
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StreamProject {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  materials: string[];
  steps: ProjectStep[];
  collaborators: string[];
}

export interface ProjectStep {
  title: string;
  description: string;
  order: number;
}

export interface CodeExecutionResult {
  language: string;
  code: string;
  result: {
    output: string;
    executionTime: string;
    memory: string;
  };
  timestamp: string;
}
