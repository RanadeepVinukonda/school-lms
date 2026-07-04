import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';

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
  ownerId: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  sharedWith: string[];
  createdAt: string;
  updatedAt: string;
}

async function getDoc(mindmapId: string) {
  const supabase = getSupabaseClient()!;
  const { data } = await supabase.from('nosql_docs').select('doc_id, data').eq('collection', 'mindmaps').eq('doc_id', mindmapId).maybeSingle();
  return data || null;
}

async function setDoc(mindmapId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseClient()!;
  const now = new Date().toISOString();
  await supabase.from('nosql_docs').upsert({ collection: 'mindmaps', doc_id: mindmapId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
}

async function ensureOwnership(mindmapId: string, userId: string): Promise<MindMap> {
  const existing = await getDoc(mindmapId);
  if (!existing) throw new NotFoundError('Mind map not found');
  const data = existing.data as MindMap;
  if (data.ownerId !== userId && !data.sharedWith.includes(userId)) {
    throw new ForbiddenError('You do not have access to this mind map');
  }
  return { ...data, id: existing.doc_id };
}

export async function createMindMap(
  userId: string,
  title: string,
  description?: string,
): Promise<MindMap> {
  const now = new Date().toISOString();
  const mindMap: Omit<MindMap, 'id'> = {
    title,
    description: description || '',
    ownerId: userId,
    nodes: [],
    edges: [],
    sharedWith: [],
    createdAt: now,
    updatedAt: now,
  };
  const id = uuidv4();
  await setDoc(id, mindMap as unknown as Record<string, unknown>);
  return { id, ...mindMap };
}

export async function getMindMapById(mindmapId: string, userId: string): Promise<MindMap> {
  return ensureOwnership(mindmapId, userId);
}

export async function updateMindMap(
  mindmapId: string,
  userId: string,
  updates: Partial<Pick<MindMap, 'title' | 'description' | 'nodes' | 'edges'>>,
): Promise<MindMap> {
  const existing = await ensureOwnership(mindmapId, userId);
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Only the owner can edit this mind map');
  }
  const updateData: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() };
  const merged = { ...existing, ...updateData };
  await setDoc(mindmapId, merged as unknown as Record<string, unknown>);
  return { ...existing, ...updates, updatedAt: updateData.updatedAt as string };
}

export async function deleteMindMap(mindmapId: string, userId: string): Promise<void> {
  const existing = await ensureOwnership(mindmapId, userId);
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Only the owner can delete this mind map');
  }
  const supabase = getSupabaseClient()!;
  await supabase.from('nosql_docs').delete().eq('collection', 'mindmaps').eq('doc_id', mindmapId);
}

export async function getUserMindMaps(userId: string): Promise<MindMap[]> {
  const supabase = getSupabaseClient()!;
  const { data: rows } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'mindmaps')
    .contains('data', { ownerId: userId });
  return (rows || [])
    .map((r) => ({ id: r.doc_id, ...r.data as Record<string, unknown> } as unknown as MindMap))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSharedMindMaps(userId: string): Promise<MindMap[]> {
  const supabase = getSupabaseClient()!;
  const { data: rows } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'mindmaps')
    .contains('data', { sharedWith: [userId] });
  return (rows || [])
    .filter((r) => (r.data as Record<string, unknown>).ownerId !== userId)
    .map((r) => ({ id: r.doc_id, ...r.data as Record<string, unknown> } as unknown as MindMap))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function shareMindMap(
  mindmapId: string,
  userId: string,
  shareWithIds: string[],
): Promise<MindMap> {
  const existing = await ensureOwnership(mindmapId, userId);
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Only the owner can share this mind map');
  }
  const currentShared = existing.sharedWith || [];
  const merged = [...new Set([...currentShared, ...shareWithIds])];
  const updated = { ...existing, sharedWith: merged, updatedAt: new Date().toISOString() };
  await setDoc(mindmapId, updated as unknown as Record<string, unknown>);
  return updated;
}

export async function pinResource(
  mindmapId: string,
  userId: string,
  nodeId: string,
  resourceId: string,
  resourceType: 'lesson' | 'concept' | 'video',
): Promise<MindMap> {
  const existing = await ensureOwnership(mindmapId, userId);
  const nodeIndex = existing.nodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) throw new NotFoundError('Node not found');
  existing.nodes[nodeIndex] = {
    ...existing.nodes[nodeIndex],
    resourceId,
    resourceType,
  };
  existing.updatedAt = new Date().toISOString();
  await setDoc(mindmapId, existing as unknown as Record<string, unknown>);
  return { ...existing, updatedAt: existing.updatedAt };
}
