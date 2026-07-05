import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
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
  const supabase = getSupabaseAdmin()!;
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

  await supabase.from('nosql_docs').insert({
    collection: 'teacherVideos', doc_id: videoId, data: videoData, updated_at: now,
  });

  logger.info('Teacher video added', { videoId, teacherId: data.teacherId });

  return videoData;
}

export async function listVideos(teacherId: string, query?: {
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  tag?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  let dbQuery = supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'teacherVideos')
    .contains('data', { teacherId });

  if (query?.textbookId) dbQuery = dbQuery.contains('data', { textbookId: query.textbookId });
  if (query?.chapterId) dbQuery = dbQuery.contains('data', { chapterId: query.chapterId });
  if (query?.conceptId) dbQuery = dbQuery.contains('data', { conceptId: query.conceptId });
  if (query?.tag) dbQuery = dbQuery.contains('data', { tags: [query.tag] });

  const { data: rows } = await dbQuery;
  const items = (rows || []).map((row) => ({ ...row.data as Record<string, unknown>, id: row.doc_id }));
  return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function removeVideo(videoId: string, teacherId: string) {
  const supabase = getSupabaseAdmin()!;
  const { data } = await supabase.from('nosql_docs').select('data')
    .eq('collection', 'teacherVideos').eq('doc_id', videoId).maybeSingle();

  if (!data) throw new NotFoundError('Video not found');

  const videoData = data.data as Record<string, unknown>;
  if (videoData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this video');
  }

  await supabase.from('nosql_docs').delete().eq('collection', 'teacherVideos').eq('doc_id', videoId);
  logger.info('Teacher video removed', { videoId, teacherId });
}

export async function attachVideoToConcept(videoId: string, teacherId: string, data: {
  textbookId: string;
  chapterId: string;
  conceptId: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing } = await supabase.from('nosql_docs').select('data')
    .eq('collection', 'teacherVideos').eq('doc_id', videoId).maybeSingle();

  if (!existing) throw new NotFoundError('Video not found');

  const videoData = existing.data as Record<string, unknown>;
  if (videoData.teacherId !== teacherId) {
    throw new ForbiddenError('You do not own this video');
  }

  const now = new Date().toISOString();
  const updated = {
    ...videoData,
    textbookId: data.textbookId,
    chapterId: data.chapterId,
    conceptId: data.conceptId,
    updatedAt: now,
  };

  await supabase.from('nosql_docs').update({ data: updated, updated_at: now })
    .eq('collection', 'teacherVideos').eq('doc_id', videoId);

  logger.info('Teacher video attached to concept', { videoId, conceptId: data.conceptId });

  return updated;
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
