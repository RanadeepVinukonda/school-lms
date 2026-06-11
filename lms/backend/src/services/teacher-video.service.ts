import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { searchVideos } from './youtube.service';

export async function addVideo(data: {
  teacherId: string;
  title: string;
  youtubeId: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  tags?: string[];
}) {
  const videoId = uuidv4();
  const now = new Date().toISOString();

  const videoData = {
    id: videoId,
    teacherId: data.teacherId,
    title: data.title,
    youtubeId: data.youtubeId,
    thumbnail: data.thumbnail,
    duration: data.duration,
    channelName: data.channelName,
    description: data.description,
    embedUrl: data.embedUrl,
    textbookId: data.textbookId || null,
    chapterId: data.chapterId || null,
    conceptId: data.conceptId || null,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  await collections.teacherVideos().doc(videoId).set(videoData);

  logger.info('Teacher video added', { videoId, teacherId: data.teacherId });

  return videoData;
}

export async function listVideos(teacherId: string, query?: {
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  tag?: string;
}) {
  let baseQuery: FirebaseFirestore.Query = collections.teacherVideos()
    .where('teacherId', '==', teacherId);

  if (query?.textbookId) {
    baseQuery = baseQuery.where('textbookId', '==', query.textbookId);
  }
  if (query?.chapterId) {
    baseQuery = baseQuery.where('chapterId', '==', query.chapterId);
  }
  if (query?.conceptId) {
    baseQuery = baseQuery.where('conceptId', '==', query.conceptId);
  }
  if (query?.tag) {
    baseQuery = baseQuery.where('tags', 'array-contains', query.tag);
  }

  const snapshot = await baseQuery.get();
  const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function removeVideo(videoId: string, teacherId: string) {
  const ref = collections.teacherVideos().doc(videoId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Video not found');
  }

  const data = doc.data()!;
  if (data.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this video');
  }

  await ref.delete();
  logger.info('Teacher video removed', { videoId, teacherId });
}

export async function attachVideoToConcept(videoId: string, teacherId: string, data: {
  textbookId: string;
  chapterId: string;
  conceptId: string;
}) {
  const ref = collections.teacherVideos().doc(videoId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new NotFoundError('Video not found');
  }

  const videoData = doc.data()!;
  if (videoData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this video');
  }

  const now = new Date().toISOString();
  await ref.update({
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    updatedAt: now,
  });

  logger.info('Teacher video attached to concept', { videoId, conceptId: data.conceptId });

  const updated = await ref.get();
  return { ...updated.data() };
}

export async function searchAndSave(teacherId: string, query: string, maxResults?: number) {
  const results = await searchVideos(query, maxResults || 5);

  const saved = [];
  for (const video of results) {
    const savedVideo = await addVideo({
      teacherId,
      title: video.title,
      youtubeId: video.youtubeId,
      thumbnail: video.thumbnail,
      duration: video.duration,
      channelName: video.channelName,
      description: video.description,
      embedUrl: video.embedUrl,
    });
    saved.push(savedVideo);
  }

  logger.info('Teacher videos searched and saved', { teacherId, query, count: saved.length });

  return saved;
}
