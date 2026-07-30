import * as educationalVideoService from './educational-video.service';
import { logger } from '../utils/logger';

export interface TeachResource {
  id: string;
  videoId: string;
  source: 'khan_academy' | 'youtube';
  sourceLabel: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  url: string;
  embedUrl: string;
  relevance: number;
}

const KHAN_ACADEMY_CHANNELS = ['Khan Academy', 'Khan Academy India', 'Khan Academy India - English'];

function isRelevant(title: string, conceptTitle: string, chapterTitle: string): boolean {
  const t = title.toLowerCase();
  const terms = [
    ...conceptTitle.toLowerCase().split(/[\s,()]+/).filter(Boolean),
    ...chapterTitle.toLowerCase().split(/[\s,()]+/).filter(Boolean),
  ];
  return terms.some((term) => term.length > 3 && t.includes(term));
}

async function searchKhanAcademyYouTube(
  conceptTitle: string,
  subject: string,
  maxResults: number,
): Promise<TeachResource[]> {
  try {
    const ytSearch = require('yt-search');
    const query = `${subject} ${conceptTitle}`;
    const r = await ytSearch(query);
    const videos = (r.videos || []).slice(0, maxResults * 2);

    return videos
      .filter((v: any) =>
        KHAN_ACADEMY_CHANNELS.some((ch) =>
          (v.author?.name || '').toLowerCase().includes(ch.toLowerCase()),
        ),
      )
      .slice(0, maxResults)
      .map((v: any, i: number) => ({
        id: `ka_yt_${v.videoId}`,
        source: 'khan_academy' as const,
        sourceLabel: 'Khan Academy',
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
        duration: v.timestamp || '0:00',
        channelName: v.author?.name || 'Khan Academy',
        description: v.description || '',
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        relevance: 1.0 - i * 0.1,
      }));
  } catch (err) {
    logger.warn('Khan Academy YouTube search failed', { conceptTitle, error: (err as Error).message });
    return [];
  }
}

export async function searchTeachResources(
  subject: string,
  chapterTitle: string,
  conceptTitle: string,
  keywords: string[] = [],
  maxResults = 6,
): Promise<TeachResource[]> {
  // 1. Search Khan Academy's YouTube channel first
  const khanResults = await searchKhanAcademyYouTube(conceptTitle, subject, maxResults);
  if (khanResults.length >= maxResults) return khanResults;

  // 2. Fill remaining slots from general YouTube search
  const queries = [
    ...(keywords.length > 0 ? keywords.slice(0, 3).map((k) => `${subject} ${conceptTitle} ${k}`) : []),
    `${subject} ${conceptTitle}`,
    `${conceptTitle} ${chapterTitle}`,
    `${conceptTitle} tutorial`,
    `${conceptTitle} explained`,
  ];

  const seen = new Set(khanResults.map((r) => r.id));
  const youtubeResults: TeachResource[] = [];
  const remaining = maxResults - khanResults.length;

  for (const q of queries) {
    if (youtubeResults.length >= remaining) break;

    const allResults = await educationalVideoService.searchYouTubeOnly(q, remaining * 2);

    for (const r of allResults) {
      const key = r.videoId || r.id;
      if (seen.has(key)) continue;
      if (!isRelevant(r.title, conceptTitle, chapterTitle)) continue;
      seen.add(key);

      youtubeResults.push({
        id: r.id,
        videoId: r.videoId,
        source: 'youtube',
        sourceLabel: 'YouTube',
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration,
        channelName: r.channelName,
        description: r.description,
        url: r.url,
        embedUrl: r.embedUrl,
        relevance: r.relevance,
      });

      if (youtubeResults.length >= remaining) break;
    }
  }

  const combined = [...khanResults, ...youtubeResults];
  return combined.slice(0, maxResults);
}
