import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { collections } from '../firebase/firestore';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

const PISTON_API = 'https://emkc.org/api/v2/piston';

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

const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  html: { language: 'html', version: '5.0.0' },
};

export async function executeCode(code: string, language: string) {
  if (language === 'html') {
    return {
      language,
      code,
      result: { output: 'HTML will be rendered in the browser via iframe.', executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  }

  const target = LANGUAGE_MAP[language];
  if (!target) {
    return {
      language,
      code,
      result: { output: 'Unsupported language', executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const res = await fetch(`${PISTON_API}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: target.language,
        version: target.version,
        files: [{ content: code }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('Piston API error', { status: res.status, body: errText });
      return {
        language,
        code,
        result: { output: `Execution service error (${res.status}). Please try again.`, executionTime: 'N/A', memory: 'N/A' },
        timestamp: new Date().toISOString(),
      };
    }

    const data = await res.json() as { run?: { stdout?: string; stderr?: string; time?: string; memory?: number } };
    const run = data.run || {};
    return {
      language,
      code,
      result: {
        output: run.stdout || run.stderr || '(no output)',
        executionTime: run.time ? `${run.time}s` : 'N/A',
        memory: run.memory ? `${Math.round(run.memory / 1024)} KB` : 'N/A',
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Code execution failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      language,
      code,
      result: { output: 'Execution request failed. Check your network connection.', executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  }
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
