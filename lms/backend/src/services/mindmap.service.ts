import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { deleteDocument } from './document.service';
import { chatCompletion } from './ai.service';

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
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', 'mindmaps').eq('doc_id', mindmapId).maybeSingle();
  if (error) throw new Error('Failed to fetch mindmap: ' + error.message);
  return data || null;
}

async function setDoc(mindmapId: string, docData: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()!;
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase.from('firestore_docs').upsert({ collection: 'mindmaps', doc_id: mindmapId, data: docData, updated_at: now }, { onConflict: 'collection,doc_id' });
  if (upsertError) throw new Error(`Failed to upsert mindmap: ${upsertError.message}`);
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
  await deleteDocument('mindmaps', mindmapId);
}

export async function getUserMindMaps(userId: string): Promise<MindMap[]> {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'mindmaps')
    .contains('data', { ownerId: userId });
  if (error) throw new Error('Failed to fetch mindmaps: ' + error.message);
  return (rows || [])
    .map((r) => ({ id: r.doc_id, ...r.data as Record<string, unknown> } as unknown as MindMap))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSharedMindMaps(userId: string): Promise<MindMap[]> {
  const supabase = getSupabaseAdmin()!;
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data')
    .eq('collection', 'mindmaps')
    .contains('data', { sharedWith: [userId] });
  if (error) throw new Error('Failed to fetch shared mindmaps: ' + error.message);
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

export async function generateMindMapFromText(
  userId: string,
  text: string,
  title: string,
  language?: string,
): Promise<MindMap> {
  const promptText = language && language !== 'en'
    ? `Extract key concepts and their relationships from this text. Return JSON strictly with format: { "nodes": [{ "id": "n1", "label": "concept name", "type": "concept" }, ...], "edges": [{ "id": "e1", "source": "n1", "target": "n2", "label": "relationship" }] }. Respond in ${language} language. Text: "${text.slice(0, 3000)}"`
    : `Extract key concepts and their relationships from this text. Return JSON strictly with format: { "nodes": [{ "id": "n1", "label": "concept name", "type": "concept" }, ...], "edges": [{ "id": "e1", "source": "n1", "target": "n2", "label": "relationship" }] }. Text: "${text.slice(0, 3000)}"`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: 'You are a mindmap generator. Return ONLY valid JSON.' },
      { role: 'user', content: promptText },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    jsonMode: true,
  });

  let parsed: { nodes: any[]; edges: any[] };
  try {
    const cleaned = response.replace(/```json\s*|\s*```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { nodes: [{ id: 'n1', label: title, type: 'concept' as const }], edges: [] };
  }

  const nodes = (parsed.nodes || []).map((n: any, idx: number) => ({
    id: n.id || `n${idx}`,
    label: n.label || 'Concept',
    type: 'concept' as const,
    x: 200 + Math.floor(idx / 5) * 250,
    y: 100 + (idx % 5) * 120,
    color: undefined,
    resourceId: undefined,
    resourceType: undefined,
  }));

  const edges = (parsed.edges || []).map((e: any, idx: number) => ({
    id: e.id || `e${idx}`,
    source: e.source,
    target: e.target,
    label: e.label || '',
  }));

  const now = new Date().toISOString();
  const mindMap: Omit<MindMap, 'id'> = {
    title,
    description: `AI-generated from text: ${text.slice(0, 100)}...`,
    ownerId: userId,
    nodes,
    edges,
    sharedWith: [],
    createdAt: now,
    updatedAt: now,
  };

  const id = uuidv4();
  await setDoc(id, mindMap as unknown as Record<string, unknown>);
  return { id, ...mindMap };
}

export async function generateTextbookMindMap(
  userId: string,
  textbookId: string,
  language?: string,
): Promise<MindMap> {
  const supabase = getSupabaseAdmin()!;

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, order')
    .eq('textbook_id', textbookId)
    .order('order');

  if (!chapters || chapters.length === 0) {
    throw new NotFoundError('No chapters found for this textbook');
  }

  const allTextParts: string[] = [];

  for (const chapter of chapters) {
    allTextParts.push(`Chapter ${chapter.order}: ${chapter.title}`);

    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, title, summary, learning_objectives')
      .eq('chapter_id', chapter.id)
      .order('order');

    if (concepts) {
      for (const concept of concepts) {
        const parts = [concept.title];
        if (concept.summary) parts.push(concept.summary);
        if (concept.learning_objectives) parts.push(concept.learning_objectives);
        allTextParts.push(parts.join('. '));
      }
    }
  }

  const aggregatedText = allTextParts.join('\n\n');
  const title = `Textbook Mind Map (${chapters.length} chapters)`;

  return generateMindMapFromText(userId, aggregatedText, title, language);
}

export async function pushToClasses(
  mindmapId: string,
  userId: string,
  classIds: string[],
): Promise<MindMap> {
  const existing = await ensureOwnership(mindmapId, userId);
  if (existing.ownerId !== userId) {
    throw new ForbiddenError('Only the owner can push this mind map');
  }

  const supabase = getSupabaseAdmin()!;

  const { data: studentsByArray, error: arrErr } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'student')
    .overlaps('class_ids', classIds);
  if (arrErr) throw new Error('Failed to fetch students: ' + arrErr.message);

  const { data: studentsBySingle, error: singleErr } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'student')
    .in('class_id', classIds);
  if (singleErr) throw new Error('Failed to fetch students: ' + singleErr.message);

  const seen = new Set<string>();
  const studentIds: string[] = [];
  for (const s of [...(studentsByArray || []), ...(studentsBySingle || [])]) {
    if (!seen.has(s.id)) { seen.add(s.id); studentIds.push(s.id); }
  }
  const currentShared = existing.sharedWith || [];
  const merged = [...new Set([...currentShared, ...studentIds])];
  const pushedClasses = [...new Set([...(existing as any).pushedToClasses || [], ...classIds])];

  const updated = {
    ...existing,
    sharedWith: merged,
    pushedToClasses: pushedClasses,
    updatedAt: new Date().toISOString(),
  };
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
