import * as educationalVideoService from './educational-video.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

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

interface RelevanceContext {
  subject: string;
  chapterTitle: string;
  conceptTitle: string;
  gradeLevel?: string;
  keywords?: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of',
  'on', 'or', 'the', 'to', 'was', 'with', 'within', 'without',
  'unit', 'units', 'chapter', 'chapters', 'lesson', 'lessons', 'class', 'classes', 'classroom',
  'grade', 'grades', 'school', 'schools', 'course', 'curriculum',
  'video', 'videos', 'tutorial', 'tutorials', 'intro', 'introduction', 'basics', 'basic',
  'part', 'parts', 'example', 'examples', 'learn', 'learning', 'learned', 'explained',
  'explanation', 'what', 'how', 'why', 'all', 'about', 'this', 'that', 'these', 'those',
  'you', 'your', 'student', 'students', 'teacher', 'teachers', 'year', 'years', 'term', 'terms',
  'board', 'ncert', 'cbse', 'icse', 'igcse', 'gseb', 'syllabus',
]);

const MIN_RELEVANCE_SCORE = 3;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function normalizePhrase(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(text: string, word: string): boolean {
  if (!word) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}([^a-z0-9]|$)`).test(text);
}

function buildGradeTerms(gradeLevel: string): string[] {
  const g = gradeLevel.trim().toLowerCase();
  const terms = new Set<string>();
  if (g) terms.add(g);

  const m = g.match(/\d{1,2}/);
  if (m) {
    const n = m[0];
    const nInt = parseInt(n, 10);
    terms.add(n);
    terms.add(`${n}th`);
    terms.add(`grade ${n}`);
    terms.add(`class ${n}`);
    terms.add(`standard ${n}`);
    if (nInt >= 1 && nInt <= 20) {
      let suffix = 'th';
      if (nInt % 100 < 11 || nInt % 100 > 13) {
        const last = nInt % 10;
        if (last === 1) suffix = 'st';
        else if (last === 2) suffix = 'nd';
        else if (last === 3) suffix = 'rd';
      }
      terms.add(`${nInt}${suffix}`);
    }
  }

  return Array.from(terms);
}

function scoreRelevance(title: string, description: string, ctx: RelevanceContext): number {
  const t = title.toLowerCase();
  const text = `${t} ${description.toLowerCase()}`;
  let score = 0;

  const conceptPhrase = normalizePhrase(ctx.conceptTitle);
  if (conceptPhrase.length >= 8 && (t.includes(conceptPhrase) || text.includes(conceptPhrase))) {
    score += 4;
  }

  for (const tok of tokenize(ctx.conceptTitle)) {
    if (containsWord(t, tok)) score += 3;
    else if (containsWord(text, tok)) score += 1.5;
  }

  for (const tok of tokenize(ctx.chapterTitle)) {
    if (containsWord(t, tok)) score += 1.5;
    else if (containsWord(text, tok)) score += 0.8;
  }

  for (const tok of tokenize(ctx.subject)) {
    if (containsWord(t, tok)) score += 1;
    else if (containsWord(text, tok)) score += 0.5;
  }

  if (ctx.gradeLevel) {
    for (const g of buildGradeTerms(ctx.gradeLevel)) {
      if (g.length > 1 && containsWord(t, g)) {
        score += 2;
        break;
      }
    }
  }

  for (const k of ctx.keywords || []) {
    for (const tok of tokenize(k)) {
      if (containsWord(t, tok)) score += 0.5;
    }
  }

  return score;
}

function corroborated(titleLower: string, ctx: RelevanceContext): boolean {
  if (tokenize(ctx.chapterTitle).some((tok) => containsWord(titleLower, tok))) return true;
  if (tokenize(ctx.subject).some((tok) => containsWord(titleLower, tok))) return true;
  if (ctx.gradeLevel && buildGradeTerms(ctx.gradeLevel).some((g) => g.length > 1 && containsWord(titleLower, g))) return true;
  return false;
}

function isRelevantVideo(title: string, description: string, ctx: RelevanceContext): boolean {
  const t = title.toLowerCase();
  const text = `${t} ${description.toLowerCase()}`;

  if (scoreRelevance(title, description, ctx) < MIN_RELEVANCE_SCORE) return false;

  const conceptTokens = tokenize(ctx.conceptTitle);
  if (conceptTokens.length === 0) {
    return true; // concept is all generic words; rely on the score threshold
  }

  const conceptPhrase = normalizePhrase(ctx.conceptTitle);
  if (conceptPhrase.length >= 8 && (t.includes(conceptPhrase) || text.includes(conceptPhrase))) {
    return true;
  }

  const inTitle = conceptTokens.filter((tok) => containsWord(t, tok));
  const inText = conceptTokens.filter((tok) => containsWord(text, tok));

  if (conceptTokens.length >= 2) {
    const distinct = new Set([...inTitle, ...inText]);
    if (distinct.size >= 2) return true;
    if (inTitle.length === 1) return corroborated(t, ctx);
    return false;
  }

  if (inTitle.length === 1) return true;
  if (inText.length === 1) return corroborated(t, ctx);
  return false;
}

// ---------------------------------------------------------------------------
// Reliable Khan Academy discovery via the official YouTube Data API.
// The internal Khan Academy GraphQL endpoint is frequently blocked (HTTP 403),
// and yt-search (scraping) is flaky, so we search Khan Academy's official
// channels through the YouTube Data API v3 when a key is configured
// (YOUTUBE_API_KEY). yt-search remains the fallback when no key is present.
// ---------------------------------------------------------------------------

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Verified official Khan Academy channel IDs.
const KNOWN_KHAN_CHANNEL_IDS = [
  'UC4a-Gbdw7vOaccHmFo40b9g', // Khan Academy (main)
  'UCg4BkaHyyE_4-RvEMJ2PTtA', // Khan Academy India - English
];

interface YtApiVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string; // formatted m:ss / h:mm:ss
}

function parseIso8601Duration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '0:00';
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${min}:${String(s).padStart(2, '0')}`;
}

async function youtubeApiSearch(options: { query: string; maxResults: number; channelId?: string }): Promise<YtApiVideo[]> {
  if (!env.YOUTUBE_API_KEY) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: options.query,
    maxResults: String(Math.min(options.maxResults, 50)),
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    key: env.YOUTUBE_API_KEY,
  });
  if (options.channelId) params.set('channelId', options.channelId);

  const res = await fetch(`${YT_API_BASE}/search?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    logger.warn('YouTube Data API search rejected', { status: res.status });
    return [];
  }

  const json = await res.json();
  const items = (json.items || []).filter((it: any) => it.id?.videoId && it.snippet?.title);

  const videos: YtApiVideo[] = items.map((it: any) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    description: it.snippet.description || '',
    thumbnail: it.snippet.thumbnails?.high?.url || it.snippet.thumbnails?.default?.url || '',
    channelTitle: it.snippet.channelTitle || '',
  }));

  await attachDurations(videos);
  return videos;
}

async function attachDurations(videos: YtApiVideo[]): Promise<void> {
  if (videos.length === 0 || !env.YOUTUBE_API_KEY) return;
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videos.map((v) => v.videoId).join(','),
    key: env.YOUTUBE_API_KEY,
  });
  try {
    const res = await fetch(`${YT_API_BASE}/videos?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const json = await res.json();
    const durById = new Map<string, string>();
    for (const it of json.items || []) {
      const iso = it.contentDetails?.duration;
      if (iso) durById.set(it.id, parseIso8601Duration(iso));
    }
    for (const v of videos) v.duration = durById.get(v.videoId);
  } catch (err) {
    logger.warn('Failed to fetch YouTube video durations', { error: (err as Error).message });
  }
}

// Resolve Khan Academy channel ids from the API by name, cached, seeded with
// verified ids so a resolution failure never blocks the Khan search.
let khanChannelCache: { ids: string[]; fetchedAt: number } | null = null;
const KHAN_CHANNEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function resolveKhanChannelIdsFromApi(): Promise<string[]> {
  if (!env.YOUTUBE_API_KEY) return [];
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'channel',
    q: 'Khan Academy',
    maxResults: '25',
    key: env.YOUTUBE_API_KEY,
  });
  const res = await fetch(`${YT_API_BASE}/search?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items || [])
    .filter((it: any) => {
      const title = it.snippet?.title || '';
      return KHAN_ACADEMY_CHANNELS.some((ch) => title.toLowerCase().includes(ch.toLowerCase()));
    })
    .map((it: any) => it.id?.channelId)
    .filter(Boolean);
}

async function getKhanAcademyChannelIds(): Promise<string[]> {
  if (khanChannelCache && Date.now() - khanChannelCache.fetchedAt < KHAN_CHANNEL_CACHE_TTL_MS) {
    return khanChannelCache.ids;
  }
  const ids = new Set<string>(KNOWN_KHAN_CHANNEL_IDS);
  try {
    for (const id of await resolveKhanChannelIdsFromApi()) ids.add(id);
  } catch (err) {
    logger.warn('Failed to resolve Khan Academy channels from API', { error: (err as Error).message });
  }
  const result = Array.from(ids);
  khanChannelCache = { ids: result, fetchedAt: Date.now() };
  return result;
}

function toTeachResource(v: YtApiVideo, source: 'khan_academy' | 'youtube', sourceLabel: string): TeachResource {
  return {
    id: `${source === 'khan_academy' ? 'ka_yt' : 'yt'}_${v.videoId}`,
    videoId: v.videoId,
    source,
    sourceLabel,
    title: v.title,
    thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    duration: v.duration || '0:00',
    channelName: v.channelTitle || sourceLabel,
    description: v.description || '',
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
    relevance: 1.0,
  };
}

async function searchKhanAcademyYouTube(
  conceptTitle: string,
  chapterTitle: string,
  subject: string,
  gradeLevel: string | undefined,
  maxResults: number,
): Promise<TeachResource[]> {
  try {
    const ytSearch = require('yt-search');
    const query = `${subject} ${conceptTitle}`.trim();
    const r = await ytSearch(query);
    const videos = (r.videos || []).slice(0, maxResults * 3);

    const ctx: RelevanceContext = { subject, chapterTitle, conceptTitle, gradeLevel };

    const relevant = videos.filter((v: any) => {
      const channel = v.author?.name || '';
      const isKhan = KHAN_ACADEMY_CHANNELS.some((ch) => channel.toLowerCase().includes(ch.toLowerCase()));
      return isKhan && isRelevantVideo(v.title || '', v.description || '', ctx);
    });

    return relevant
      .sort((a: any, b: any) =>
        scoreRelevance(b.title || '', b.description || '', ctx) -
        scoreRelevance(a.title || '', a.description || '', ctx),
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

// Reliable Khan-first search: official YouTube Data API against Khan Academy's
// channels first (with relevance filtering), falling back to yt-search when no
// API key is configured or the API call fails.
async function searchKhanAcademyVideos(
  conceptTitle: string,
  chapterTitle: string,
  subject: string,
  gradeLevel: string | undefined,
  maxResults: number,
): Promise<TeachResource[]> {
  const ctx: RelevanceContext = { subject, chapterTitle, conceptTitle, gradeLevel };

  if (env.YOUTUBE_API_KEY) {
    try {
      const channelIds = await getKhanAcademyChannelIds();
      const collected: TeachResource[] = [];
      const seen = new Set<string>();

      for (const channelId of channelIds) {
        if (collected.length >= maxResults) break;
        const results = await youtubeApiSearch({
          query: `${subject} ${conceptTitle}`,
          maxResults: Math.min(maxResults * 3, 50),
          channelId,
        });
        for (const r of results) {
          if (seen.has(r.videoId)) continue;
          seen.add(r.videoId);
          if (isRelevantVideo(r.title, r.description, ctx)) {
            collected.push(toTeachResource(r, 'khan_academy', 'Khan Academy'));
          }
        }
      }

      if (collected.length > 0) {
        collected.sort((a, b) =>
          scoreRelevance(b.title, b.description, ctx) -
          scoreRelevance(a.title, a.description, ctx),
        );
        return collected.slice(0, maxResults).map((v, i) => ({ ...v, relevance: 1.0 - i * 0.1 }));
      }

      logger.info('Khan Academy reliable search found no relevant videos; using yt-search fallback', { conceptTitle });
    } catch (err) {
      logger.warn('Khan Academy reliable search failed; using yt-search fallback', {
        conceptTitle,
        error: (err as Error).message,
      });
    }
  }

  return searchKhanAcademyYouTube(conceptTitle, chapterTitle, subject, gradeLevel, maxResults);
}

export async function searchTeachResources(
  subject: string,
  chapterTitle: string,
  conceptTitle: string,
  keywords: string[] = [],
  maxResults = 6,
  gradeLevel?: string,
): Promise<TeachResource[]> {
  // 1. Khan Academy always first (reliable API path, yt-search fallback).
  const khanResults = await searchKhanAcademyVideos(conceptTitle, chapterTitle, subject, gradeLevel, maxResults);

  // 2. If Khan Academy has enough relevant videos, done.
  if (khanResults.length >= maxResults) {
    logger.info('Teach resource source selected', { conceptTitle, selected: 'khan_academy', count: khanResults.length });
    return khanResults;
  }

  const ctx: RelevanceContext = { subject, chapterTitle, conceptTitle, gradeLevel, keywords };

  const queries = [
    ...(keywords.length > 0 ? keywords.slice(0, 3).map((k) => `${subject} ${conceptTitle} ${k}`) : []),
    `${subject} ${conceptTitle}`,
    `${conceptTitle} ${chapterTitle}`,
    `${conceptTitle} tutorial`,
    `${conceptTitle} explained`,
  ];

  // 3. Fill remaining slots with genuinely relevant videos from any channel.
  //    The official YouTube Data API is preferred when a key is configured;
  //    yt-search fills any gaps. Ordering is by priority, never by response speed.
  const youtubeResults: TeachResource[] = [];
  const seen = new Set(khanResults.map((r) => r.videoId || r.id));
  const remaining = maxResults - khanResults.length;

  const applyCandidates = (
    candidates: Array<{ title?: string; description?: string; videoId?: string; id?: string }>,
    toResource: (c: any) => TeachResource,
  ) => {
    const scored = candidates
      .filter((r) => {
        const key = r.videoId || r.id || '';
        if (seen.has(key)) return false;
        return isRelevantVideo(r.title || '', r.description || '', ctx);
      })
      .sort((a, b) =>
        scoreRelevance(b.title || '', b.description || '', ctx) -
        scoreRelevance(a.title || '', a.description || '', ctx),
      );

    for (const r of scored) {
      const key = r.videoId || r.id || '';
      if (seen.has(key)) continue;
      seen.add(key);
      youtubeResults.push(toResource(r));
      if (youtubeResults.length >= remaining) break;
    }
  };

  for (const q of queries) {
    if (youtubeResults.length >= remaining) break;

    try {
      // Official API first (reliable source).
      const apiVideos = await youtubeApiSearch({ query: q, maxResults: remaining * 3 });
      applyCandidates(apiVideos, (v) => toTeachResource(v as YtApiVideo, 'youtube', 'YouTube'));
      if (youtubeResults.length >= remaining) break;

      // yt-search fallback for the same query.
      const ytVideos = await educationalVideoService.searchYouTubeOnly(q, remaining * 2);
      applyCandidates(ytVideos, (v) => ({
        id: v.id,
        videoId: v.videoId,
        source: 'youtube' as const,
        sourceLabel: 'YouTube',
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration,
        channelName: v.channelName,
        description: v.description,
        url: v.url,
        embedUrl: v.embedUrl,
        relevance: v.relevance,
      }));
    } catch (err) {
      logger.warn('Teach resource YouTube fallback failed', { query: q, error: (err as Error).message });
    }
  }

  const ranked = [...khanResults, ...youtubeResults].slice(0, maxResults);
  logger.info('Teach resource source selected', {
    conceptTitle,
    selected: youtubeResults.length > 0 ? 'youtube' : 'none',
    khanAcademy: khanResults.length,
    youtube: youtubeResults.length,
    total: ranked.length,
  });

  return ranked;
}
