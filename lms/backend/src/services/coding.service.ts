import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CodingProject {
  id?: string;
  title: string;
  language: 'javascript' | 'python' | 'html';
  code: string;
  ownerId: string;
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StreamProject {
  id?: string;
  title: string;
  description: string;
  subjects: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  materials: string[];
  steps: { title: string; description: string; order: number }[];
  collaborators: string[];
  createdAt: string;
}

export async function getAllProjects() {
  const snapshot = await collections.codingProjects()
    .orderBy('updatedAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getProjectById(id: string) {
  const snap = await collections.codingProjects().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Coding project not found');
  return { id: snap.id, ...snap.data() };
}

export async function createProject(data: Omit<CodingProject, 'id' | 'createdAt' | 'updatedAt' | 'collaborators'>) {
  const project: CodingProject = {
    ...data,
    collaborators: [],
    code: data.code || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ref = collections.codingProjects().doc();
  await ref.set(project);
  logger.info('Coding project created', { id: ref.id, title: project.title });
  return { id: ref.id, ...project };
}

export async function updateProject(id: string, data: Partial<CodingProject>, userId: string) {
  const snap = await collections.codingProjects().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Coding project not found');
  const existing = snap.data() as CodingProject;
  if (existing.ownerId !== userId && !existing.collaborators.includes(userId)) {
    throw new ForbiddenError('Not authorized to edit this project');
  }
  await collections.codingProjects().doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  const updated = await collections.codingProjects().doc(id).get();
  return { id: updated.id, ...updated.data() };
}

export async function deleteProject(id: string, userId: string) {
  const snap = await collections.codingProjects().doc(id).get();
  if (!snap.exists) throw new NotFoundError('Coding project not found');
  const existing = snap.data() as CodingProject;
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Not authorized to delete this project');
  }
  await collections.codingProjects().doc(id).delete();
  logger.info('Coding project deleted', { id });
}

export async function executeCode(code: string, language: string) {
  const mockResults: Record<string, unknown> = {
    javascript: {
      output: 'Hello from JavaScript sandbox!\n> Execution completed successfully.',
      executionTime: '0.002s',
      memory: '4.2 MB',
    },
    python: {
      output: 'Python execution requires a backend Python runtime.\nIn production, this would connect to a sandboxed interpreter.',
      executionTime: 'N/A',
      memory: 'N/A',
    },
    html: {
      output: 'HTML will be rendered in the browser via iframe.',
      executionTime: 'N/A',
      memory: 'N/A',
    },
  };

  return {
    language,
    code,
    result: mockResults[language] || { output: 'Unsupported language', executionTime: 'N/A', memory: 'N/A' },
    timestamp: new Date().toISOString(),
  };
}

export async function getAllStreamProjects() {
  const snapshot = await collections.streamProjects()
    .orderBy('createdAt', 'desc')
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function createStreamProject(data: Omit<StreamProject, 'id' | 'createdAt' | 'collaborators'>) {
  const project: StreamProject = {
    ...data,
    collaborators: [],
    createdAt: new Date().toISOString(),
  };
  const ref = collections.streamProjects().doc();
  await ref.set(project);
  logger.info('STREAM project created', { id: ref.id, title: project.title });
  return { id: ref.id, ...project };
}

export async function addStreamCollaborator(projectId: string, collaboratorId: string) {
  const snap = await collections.streamProjects().doc(projectId).get();
  if (!snap.exists) throw new NotFoundError('STREAM project not found');
  await collections.streamProjects().doc(projectId).update({
    collaborators: FieldValue.arrayUnion(collaboratorId),
  });
  const updated = await collections.streamProjects().doc(projectId).get();
  return { id: updated.id, ...updated.data() };
}
