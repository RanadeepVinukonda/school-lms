import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { deleteDocument } from './document.service';
import { createBulkNotifications } from './notification.service';

const QUIZV2 = 'quizV2';
const MINDMAP = 'mindmaps';

export type PublishableContentType = 'test' | 'resource' | 'mindmap' | 'video' | 'note' | 'material';
export type PublishScope = 'class' | 'students' | 'subject';

export interface PublishRequest {
  contentType: PublishableContentType;
  contentId: string;
  classId: string;
  subjectId?: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  teacherId: string;
  scope: PublishScope;
  targetStudentIds?: string[];
  scheduledAt?: string;
}

export interface PublishedContent {
  id: string;
  contentType: PublishableContentType;
  contentId: string;
  title: string;
  description?: string;
  classId: string;
  subjectId?: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  teacherId: string;
  scope: PublishScope;
  targetStudentIds: string[];
  publishedAt: string;
  scheduledAt?: string;
  status: 'published' | 'scheduled';
}

export async function publishContent(request: PublishRequest): Promise<PublishedContent> {
  const assignment = await getTeacherAssignment(request.teacherId, request.classId);
  if (!assignment) {
    throw new ForbiddenError('You are not assigned to this class');
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  let title = '';
  let description = '';

  switch (request.contentType) {
    case 'test': {
      const { data: testRow, error } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', QUIZV2).eq('doc_id', request.contentId).maybeSingle();
      if (error) throw error;
      if (testRow?.data) {
        const testData = testRow.data as Record<string, unknown>;
        title = (testData.title as string) || 'Untitled Test';
        description = (testData.description as string) || '';
      }
      break;
    }
    case 'resource': {
      const { data: resRow, error } = await getSupabaseAdmin().from('concept_resources').select('title, description').eq('id', request.contentId).maybeSingle();
      if (error) throw error;
      if (resRow) {
        title = resRow.title || 'Resource';
        description = resRow.description || '';
      }
      break;
    }
    case 'mindmap': {
      const { data: mmRow, error } = await getSupabaseAdmin().from('firestore_docs').select('data').eq('collection', MINDMAP).eq('doc_id', request.contentId).maybeSingle();
      if (error) throw error;
      if (mmRow?.data) {
        const mmData = mmRow.data as Record<string, unknown>;
        title = (mmData.title as string) || 'Mind Map';
        description = (mmData.description as string) || '';
      }
      break;
    }
    case 'video': {
      const { data: videoDoc, error: videoErr } = await getSupabaseAdmin()
        .from('concept_videos')
        .select('title, description')
        .eq('id', request.contentId)
        .single();
      if (videoErr) throw videoErr;
      if (videoDoc) {
        title = videoDoc.title || 'Video';
        description = videoDoc.description || '';
      }
      break;
    }
    case 'note':
    case 'material': {
      const { data: noteDoc, error: noteErr } = await getSupabaseAdmin()
        .from('concept_notes')
        .select('summary, notes')
        .eq('concept_id', request.conceptId)
        .single();
      if (noteErr) throw noteErr;
      if (noteDoc) {
        title = `Notes: ${request.conceptId}`;
        description = noteDoc.summary || noteDoc.notes?.substring(0, 200) || '';
      }
      break;
    }
  }

  title = title || `${request.contentType} content`;

  const published: PublishedContent = {
    id,
    contentType: request.contentType,
    contentId: request.contentId,
    title,
    description,
    classId: request.classId,
    subjectId: request.subjectId,
    textbookId: request.textbookId,
    chapterId: request.chapterId,
    conceptId: request.conceptId,
    teacherId: request.teacherId,
    scope: request.scope,
    targetStudentIds: request.targetStudentIds || [],
    publishedAt: now,
    scheduledAt: request.scheduledAt,
    status: request.scheduledAt ? 'scheduled' : 'published',
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('firestore_docs').upsert({
    collection: QUIZV2, doc_id: id, data: published as unknown as Record<string, unknown>,
    updated_at: now,
  }, { onConflict: 'collection,doc_id' });
  if (error) throw error;

  logger.info('Content published', {
    publishId: id,
    contentType: request.contentType,
    classId: request.classId,
    scope: request.scope,
  });

  try {
    if (request.scope === 'students' && request.targetStudentIds && request.targetStudentIds.length > 0) {
      await createBulkNotifications(
        request.targetStudentIds.map((studentId) => ({
          userId: studentId,
          type: 'content_published',
          title: `New ${request.contentType}: ${title}`,
          body: `New ${request.contentType} content "${title}" has been published.`,
          data: { publishId: id, contentType: request.contentType, contentId: request.contentId, classId: request.classId },
        }))
      );
    } else {
      const { data: studentRows, error: studentFetchErr } = await supabase.from('users').select('id').contains('class_ids', [request.classId]);
      if (studentFetchErr) throw studentFetchErr;
      const studentIds = (studentRows || []).map((r) => r.id);

      if (studentIds.length > 0) {
        await createBulkNotifications(
          studentIds.map((studentId) => ({
            userId: studentId,
            type: 'content_published',
            title: `New ${request.contentType}: ${title}`,
            body: `New ${request.contentType} content "${title}" has been published.`,
            data: { publishId: id, contentType: request.contentType, contentId: request.contentId, classId: request.classId },
          }))
        );
      }
    }
  } catch (notifErr) {
    logger.error('Failed to send content published notifications', { publishId: id, error: notifErr });
  }

  return published;
}

function rowToPublished(r: { doc_id: string; data: unknown }): PublishedContent {
  return { id: r.doc_id, ...(r.data as object) } as PublishedContent;
}

export async function getPublishedContent(classId: string, contentType?: PublishableContentType): Promise<PublishedContent[]> {
  const supabase = getSupabaseAdmin();
  let q: any = supabase.from('firestore_docs').select('doc_id, data').eq('collection', QUIZV2).contains('data', { classId });

  if (contentType) {
    q = q.contains('data', { contentType });
  }

  const { data: rows, error } = await q;
  if (error) throw error;

  const items = (rows || []).map(rowToPublished);
  return items.sort((a: PublishedContent, b: PublishedContent) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getPublishedContentForStudent(studentId: string, classIds: string[]): Promise<PublishedContent[]> {
  if (classIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const allContent: PublishedContent[] = [];

  for (const classId of classIds) {
    const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', QUIZV2).contains('data', { classId });
    if (error) throw error;

    const items = (rows || []).map(rowToPublished);
    const visible = items.filter((item) => {
      if (item.scope === 'class') return true;
      if (item.scope === 'students' && item.targetStudentIds.includes(studentId)) return true;
      return false;
    });
    allContent.push(...visible);
  }

  return allContent.sort((a: PublishedContent, b: PublishedContent) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function unpublishContent(publishId: string, teacherId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: row, error: fetchErr } = await supabase.from('firestore_docs').select('data').eq('collection', QUIZV2).eq('doc_id', publishId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row?.data) throw new NotFoundError('Published content not found');

  const existing = row.data as PublishedContent;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your content');

  await deleteDocument(QUIZV2, publishId);
  logger.info('Content unpublished', { publishId });
}

export async function scheduleContent(request: PublishRequest & { scheduledAt: string }): Promise<PublishedContent> {
  return publishContent(request);
}

export async function getContentStats(teacherId: string): Promise<{
  totalPublished: number;
  byType: Record<string, number>;
  recentPublishes: PublishedContent[];
}> {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase.from('firestore_docs').select('doc_id, data').eq('collection', QUIZV2).contains('data', { teacherId });
  if (error) throw error;

  const items = (rows || []).map(rowToPublished);
  const sorted = [...items].sort((a: PublishedContent, b: PublishedContent) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const byType: Record<string, number> = {};
  for (const item of items) {
    byType[item.contentType] = (byType[item.contentType] || 0) + 1;
  }

  return {
    totalPublished: items.length,
    byType,
    recentPublishes: sorted.slice(0, 10),
  };
}
