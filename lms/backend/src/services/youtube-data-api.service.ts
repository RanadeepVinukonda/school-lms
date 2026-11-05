import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Official YouTube Data API v3 helpers shared by the educational-video search
// and the teach-resources pipeline. The Khan Academy internal GraphQL endpoint
// is frequently blocked (HTTP 403) and yt-search (scraping) is flaky on some
// hosts, so the official API is the reliable primary source. Every function
// degrades gracefully when YOUTUBE_API_KEY is not configured.
// ---------------------------------------------------------------------------

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Official Khan Academy channel names used to whitelist channel-resolution hits.
export const KHAN_ACADEMY_CHANNELS = ['Khan Academy', 'Khan Academy India', 'Khan Academy India - English'];

// Verified official Khan Academy channel IDs.
const KNOWN_KHAN_CHANNEL_IDS = [
  'UC4a-Gbdw7vOaccHmFo40b9g', // Khan Academy (main)
  'UCg4BkaHyyE_4-RvEMJ2PTtA', // Khan Academy India - English
];

export interface YtApiVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration?: string; // formatted m:ss / h:mm:ss
}

export function parseIso8601Duration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '0:00';
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${min}:${String(s).padStart(2, '0')}`;
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

export async function youtubeApiSearch(options: { query: string; maxResults: number; channelId?: string }): Promise<YtApiVideo[]> {
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

export async function getKhanAcademyChannelIds(): Promise<string[]> {
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

/** Search Khan Academy's official channels through the YouTube Data API. */
export async function searchKhanAcademyViaApi(query: string, maxResults: number): Promise<YtApiVideo[]> {
  if (!env.YOUTUBE_API_KEY) return [];
  try {
    const channelIds = await getKhanAcademyChannelIds();
    const collected: YtApiVideo[] = [];
    const seen = new Set<string>();
    for (const channelId of channelIds) {
      if (collected.length >= maxResults) break;
      const results = await youtubeApiSearch({ query, maxResults: Math.min(maxResults * 3, 50), channelId });
      for (const r of results) {
        if (seen.has(r.videoId)) continue;
        seen.add(r.videoId);
        collected.push(r);
        if (collected.length >= maxResults) break;
      }
    }
    return collected;
  } catch (err) {
    logger.warn('Khan Academy YouTube API search failed', { error: (err as Error).message });
    return [];
  }
}
