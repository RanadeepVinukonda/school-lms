import { v4 as uuidv4 } from 'uuid';
import { FieldValue, Timestamp } from '../database/adapter';
import { collections } from '../database/adapter';
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

async function ensureOwnership(mindmapId: string, userId: string): Promise<MindMap> {
  const ref = collections.mindmaps().doc(mindmapId);
  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError('Mind map not found');
  const data = snap.data() as MindMap;
  if (data.ownerId !== userId && !data.sharedWith.includes(userId)) {
    throw new ForbiddenError('You do not have access to this mind map');
  }
  return { ...data, id: snap.id };
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
  const ref = await collections.mindmaps().add(mindMap);
  return { id: ref.id, ...mindMap };
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
  await collections.mindmaps().doc(mindmapId).update(updateData);
  return { ...existing, ...updates, updatedAt: updateData.updatedAt as string };
}

export async function deleteMindMap(mindmapId: string, userId: string): Promise<void> {
  const existing = await ensureOwnership(mindmapId, userId);
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Only the owner can delete this mind map');
  }
  await collections.mindmaps().doc(mindmapId).delete();
}

export async function getUserMindMaps(userId: string): Promise<MindMap[]> {
  const snapshot = await collections.mindmaps()
    .where('ownerId', '==', userId)
    .get();
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as MindMap))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSharedMindMaps(userId: string): Promise<MindMap[]> {
  const snapshot = await collections.mindmaps()
    .where('sharedWith', 'array-contains', userId)
    .get();
  return snapshot.docs
    .filter((d) => d.data().ownerId !== userId)
    .map((d) => ({ id: d.id, ...d.data() } as MindMap))
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
  await collections.mindmaps().doc(mindmapId).update({
    sharedWith: merged,
    updatedAt: new Date().toISOString(),
  });
  return { ...existing, sharedWith: merged, updatedAt: new Date().toISOString() };
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
  await collections.mindmaps().doc(mindmapId).update({
    nodes: existing.nodes,
    updatedAt: new Date().toISOString(),
  });
  return { ...existing, updatedAt: new Date().toISOString() };
}
