import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { deleteDocument } from './document.service';
import { logger } from '../utils/logger';

const exec = promisify(execFile);

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

const NOSQL = { coding: 'codingProjects', stream: 'streamProjects' };

async function getNsDoc(collection: string, docId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('firestore_docs').select('data, doc_id').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (error) throw new Error('Failed to fetch document: ' + error.message);
  return data ? { id: data.doc_id, ...data.data as Record<string, unknown> } : null;
}

async function upsertNsDoc(collection: string, docId: string, data: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await supabase.from('firestore_docs').select('data').eq('collection', collection).eq('doc_id', docId).maybeSingle();
  if (fetchErr) throw new Error('Failed to fetch existing document: ' + fetchErr.message);
  const merged = { ...(existing?.data as Record<string, unknown> ?? {}), ...data };
  const { error } = await supabase.from('firestore_docs').upsert({ collection, doc_id: docId, data: merged, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error('Failed to upsert document: ' + error.message);
}

export async function getAllProjects() {
  const supabase = getSupabaseAdmin();
  const { data: docs, error } = await supabase.from('firestore_docs').select('data, doc_id').eq('collection', NOSQL.coding).order('updated_at', { ascending: false });
  if (error) throw new Error('Failed to fetch coding projects: ' + error.message);
  return (docs || []).map((d) => ({ id: d.doc_id, ...d.data as Record<string, unknown> }));
}

export async function getProjectById(id: string) {
  const doc = await getNsDoc(NOSQL.coding, id);
  if (!doc) throw new NotFoundError('Coding project not found');
  return doc;
}

export async function createProject(data: Omit<CodingProject, 'id' | 'createdAt' | 'updatedAt' | 'collaborators'>) {
  const supabase = getSupabaseAdmin();
  const id = uuidv4();
  const now = new Date().toISOString();
  const project = { ...data, collaborators: [], code: data.code || '', createdAt: now, updatedAt: now };
  const { error } = await supabase.from('firestore_docs').upsert({ collection: NOSQL.coding, doc_id: id, data: project, created_at: now, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error('Failed to upsert coding project: ' + error.message);
  logger.info('Coding project created', { id, title: project.title });
  return { id, ...project };
}

export async function updateProject(id: string, data: Partial<CodingProject>, userId: string) {
  const doc = await getNsDoc(NOSQL.coding, id);
  if (!doc) throw new NotFoundError('Coding project not found');
  const existing = doc as CodingProject;
  if (existing.ownerId !== userId && !existing.collaborators.includes(userId)) {
    throw new ForbiddenError('Not authorized to edit this project');
  }
  await upsertNsDoc(NOSQL.coding, id, { ...data, updatedAt: new Date().toISOString() });
  return getNsDoc(NOSQL.coding, id) as Promise<Record<string, unknown>>;
}

export async function deleteProject(id: string, userId: string) {
  const doc = await getNsDoc(NOSQL.coding, id);
  if (!doc) throw new NotFoundError('Coding project not found');
  if ((doc as CodingProject).ownerId !== userId) {
    throw new ForbiddenError('Not authorized to delete this project');
  }
  await deleteDocument(NOSQL.coding, id);
  logger.info('Coding project deleted', { id });
}

const TIMEOUT_MS = 10000;

export async function executeCode(code: string, language: string) {
  if (language === 'html') {
    return {
      language, code,
      result: { output: 'HTML will be rendered in the browser via iframe.', executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const tmpFile = join(tmpdir(), `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    let stdout = '', stderr = '';

    if (language === 'python') {
      const filePath = `${tmpFile}.py`;
      await writeFile(filePath, code);
      try {
        const result = await exec('python3', [filePath], { timeout: TIMEOUT_MS, maxBuffer: 1024 * 100 });
        stdout = result.stdout || '';
        stderr = result.stderr || '';
      } catch (execError: any) {
        stdout = execError.stdout || '';
        stderr = execError.stderr || execError.message || '';
      }
      await unlink(filePath).catch((unlinkErr) => {
        logger.warn('Failed to cleanup temp file', { filePath, error: unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr) });
      });
    } else if (language === 'javascript') {
      const filePath = `${tmpFile}.js`;
      await writeFile(filePath, code);
      try {
        const result = await exec('node', [filePath], { timeout: TIMEOUT_MS, maxBuffer: 1024 * 100 });
        stdout = result.stdout || '';
        stderr = result.stderr || '';
      } catch (execError: any) {
        stdout = execError.stdout || '';
        stderr = execError.stderr || execError.message || '';
      }
      await unlink(filePath).catch((unlinkErr) => {
        logger.warn('Failed to cleanup temp file', { filePath, error: unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr) });
      });
    } else {
      return {
        language, code,
        result: { output: 'Unsupported language', executionTime: 'N/A', memory: 'N/A' },
        timestamp: new Date().toISOString(),
      };
    }

    const output = stdout || stderr || '(no output)';
    return {
      language, code,
      result: { output, executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Code execution failed', { error: error instanceof Error ? error.message : String(error) });
    return {
      language, code,
      result: { output: 'Execution failed. Check your code for syntax errors.', executionTime: 'N/A', memory: 'N/A' },
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getAllStreamProjects() {
  const supabase = getSupabaseAdmin();
  const { data: docs, error } = await supabase.from('firestore_docs').select('data, doc_id').eq('collection', NOSQL.stream).order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch stream projects: ' + error.message);
  return (docs || []).map((d) => ({ id: d.doc_id, ...d.data as Record<string, unknown> }));
}

export async function createStreamProject(data: Omit<StreamProject, 'id' | 'createdAt' | 'collaborators'>) {
  const supabase = getSupabaseAdmin();
  const id = uuidv4();
  const now = new Date().toISOString();
  const project = { ...data, collaborators: [], createdAt: now };
  const { error } = await supabase.from('firestore_docs').upsert({ collection: NOSQL.stream, doc_id: id, data: project, created_at: now, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (error) throw new Error('Failed to upsert stream project: ' + error.message);
  logger.info('STREAM project created', { id, title: project.title });
  return { id, ...project };
}

export async function getStreamProjectById(id: string) {
  const doc = await getNsDoc(NOSQL.stream, id);
  if (!doc) throw new NotFoundError('STREAM project not found');
  return doc;
}

export async function updateStreamProject(id: string, data: Partial<StreamProject>, userId: string) {
  const doc = await getNsDoc(NOSQL.stream, id);
  if (!doc) throw new NotFoundError('STREAM project not found');
  await upsertNsDoc(NOSQL.stream, id, { ...data, updatedAt: new Date().toISOString() });
  return getNsDoc(NOSQL.stream, id) as Promise<Record<string, unknown>>;
}

export async function deleteStreamProject(id: string) {
  const doc = await getNsDoc(NOSQL.stream, id);
  if (!doc) throw new NotFoundError('STREAM project not found');
  await deleteDocument(NOSQL.stream, id);
  logger.info('STREAM project deleted', { id });
}

export async function addStreamCollaborator(projectId: string, collaboratorId: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase.from('firestore_docs').select('data').eq('collection', NOSQL.stream).eq('doc_id', projectId).maybeSingle();
  if (error) throw new Error('Failed to fetch stream project: ' + error.message);
  if (!existing) throw new NotFoundError('STREAM project not found');
  const data = existing.data as Record<string, unknown>;
  const collaborators = [...new Set([...(data.collaborators as string[] || []), collaboratorId])];
  const now = new Date().toISOString();
  const { error: upsertErr } = await supabase.from('firestore_docs').upsert({ collection: NOSQL.stream, doc_id: projectId, data: { ...data, collaborators, updatedAt: now }, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (upsertErr) throw new Error('Failed to add collaborator to stream project: ' + upsertErr.message);
  return getNsDoc(NOSQL.stream, projectId) as Promise<Record<string, unknown>>;
}

export async function removeStreamCollaborator(projectId: string, collaboratorId: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error } = await supabase.from('firestore_docs').select('data').eq('collection', NOSQL.stream).eq('doc_id', projectId).maybeSingle();
  if (error) throw new Error('Failed to fetch stream project: ' + error.message);
  if (!existing) throw new NotFoundError('STREAM project not found');
  const data = existing.data as Record<string, unknown>;
  const collaborators = (data.collaborators as string[] || []).filter((c: string) => c !== collaboratorId);
  const now = new Date().toISOString();
  const { error: upsertErr } = await supabase.from('firestore_docs').upsert({ collection: NOSQL.stream, doc_id: projectId, data: { ...data, collaborators, updatedAt: now }, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (upsertErr) throw new Error('Failed to remove collaborator from stream project: ' + upsertErr.message);
  return getNsDoc(NOSQL.stream, projectId) as Promise<Record<string, unknown>>;
}
