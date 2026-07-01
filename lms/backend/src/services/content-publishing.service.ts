import { randomUUID } from 'crypto';
import { collections } from '../database/adapter';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { getTeacherAssignment } from './teacher-class-subject.service';
import { createBulkNotifications } from './notification.service';

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
      const testDoc = await collections.quizV2().doc(request.contentId).get();
      if (testDoc.exists) {
        const testData = testDoc.data()!;
        title = testData.title || 'Untitled Test';
        description = testData.description || '';
      }
      break;
    }
    case 'resource': {
      const resourceDoc = await collections.textbooks()
        .doc(request.textbookId || '')
        .collection('chapters')
        .doc(request.chapterId || '')
        .collection('concepts')
        .doc(request.conceptId || '')
        .collection('resources')
        .doc(request.contentId)
        .get();
      if (resourceDoc.exists) {
        const data = resourceDoc.data()!;
        title = data.title || 'Resource';
        description = data.description || '';
      }
      break;
    }
    case 'mindmap': {
      const mindmapDoc = await collections.mindmaps().doc(request.contentId).get();
      if (mindmapDoc.exists) {
        const data = mindmapDoc.data()!;
        title = data.title || 'Mind Map';
        description = data.description || '';
      }
      break;
    }
    case 'video': {
      const videoDoc = await getSupabaseAdmin()!
        .from('concept_videos')
        .select('title, description')
        .eq('id', request.contentId)
        .single();
      if (videoDoc.data) {
        title = videoDoc.data.title || 'Video';
        description = videoDoc.data.description || '';
      }
      break;
    }
    case 'note':
    case 'material': {
      const noteDoc = await getSupabaseAdmin()!
        .from('concept_notes')
        .select('summary, notes')
        .eq('concept_id', request.conceptId)
        .single();
      if (noteDoc.data) {
        title = `Notes: ${request.conceptId}`;
        description = noteDoc.data.summary || noteDoc.data.notes?.substring(0, 200) || '';
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

  await collections.quizV2().doc(id).set(published);

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
      const studentsSnap = await collections.users()
        .where('classIds', 'array-contains', request.classId)
        .get();
      const studentIds = studentsSnap.docs.map((d) => d.id);

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

export async function getPublishedContent(classId: string, contentType?: PublishableContentType): Promise<PublishedContent[]> {
  let query = collections.quizV2()
    .where('classId', '==', classId);

  if (contentType) {
    query = query.where('contentType', '==', contentType);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PublishedContent));

  return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function getPublishedContentForStudent(studentId: string, classIds: string[]): Promise<PublishedContent[]> {
  if (classIds.length === 0) return [];

  const allContent: PublishedContent[] = [];

  for (const classId of classIds) {
    const snapshot = await collections.quizV2()
      .where('classId', '==', classId)
      .get();

    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PublishedContent));

    const visible = items.filter((item) => {
      if (item.scope === 'class') return true;
      if (item.scope === 'students' && item.targetStudentIds.includes(studentId)) return true;
      return false;
    });

    allContent.push(...visible);
  }

  return allContent.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function unpublishContent(publishId: string, teacherId: string): Promise<void> {
  const ref = collections.quizV2().doc(publishId);
  const doc = await ref.get();

  if (!doc.exists) throw new NotFoundError('Published content not found');
  const existing = doc.data() as PublishedContent;
  if (existing.teacherId !== teacherId) throw new ForbiddenError('Not your content');

  await ref.delete();
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
  const snapshot = await collections.quizV2()
    .where('teacherId', '==', teacherId)
    .get();

  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PublishedContent));
  const sorted = items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

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
