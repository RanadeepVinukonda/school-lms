export interface MindMapNode {
  id: string;
  label: string;
  type: 'concept' | 'topic' | 'note' | 'resource' | 'custom';
  x: number;
  y: number;
  color?: string;
  resourceId?: string;
  resourceType?: 'lesson' | 'concept' | 'video';
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface MindMap {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  ownerId: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}
