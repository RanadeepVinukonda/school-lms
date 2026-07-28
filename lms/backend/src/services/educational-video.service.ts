import { logger } from '../utils/logger';

const KA_GRAPHQL = 'https://www.khanacademy.org/api/internal/graphql';
const WM_API = 'https://commons.wikimedia.org/w/api.php';

interface VideoResult {
  id: string;
  source: 'khan_academy' | 'wikimedia' | 'youtube';
  sourceLabel: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  url: string;
  relevance: number;
}

async function searchKhanAcademy(query: string, maxResults: number): Promise<VideoResult[]> {
  try {
    const body = JSON.stringify([
      {
        operationName: 'search',
        variables: { query, maxResults },
        query: `query search($query: String!, $maxResults: Int) {
          search(query: $query, maxResults: $maxResults) {
            results {
              ... on Video {
                id
                title
                description
                duration
                thumbnailUrl: imageUrl
                youtubeId
                slug
              }
            }
          }
        }`,
      },
    ]);

    const res = await fetch(KA_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const results = json?.[0]?.data?.search?.results || [];
    const videos = results.filter((r: any) => r.__typename === 'Video' || r.youtubeId);

    return videos.slice(0, maxResults).map((v: any, i: number) => ({
      id: `ka_${v.youtubeId || v.id}`,
      source: 'khan_academy' as const,
      sourceLabel: 'Khan Academy',
      videoId: v.youtubeId || v.id,
      title: v.title || 'Khan Academy Video',
      thumbnail: v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`,
      duration: v.duration ? formatDuration(v.duration) : '5:00',
      channelName: 'Khan Academy',
      description: v.description || '',
      embedUrl: v.youtubeId ? `https://www.youtube.com/embed/${v.youtubeId}` : `https://www.khanacademy.org/${v.slug || ''}`,
      url: v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : `https://www.khanacademy.org/${v.slug || ''}`,
      relevance: 1.0 - i * 0.15,
    }));
  } catch (err) {
    logger.warn('Khan Academy search failed', { query, error: (err as Error).message });
    return [];
  }
}

async function searchWikimedia(query: string, maxResults: number): Promise<VideoResult[]> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `filetype:video ${query}`,
      gsrnamespace: '6',
      gsrlimit: String(Math.min(maxResults, 50)),
      prop: 'imageinfo|info',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '320',
      inprop: 'url',
    });

    const res = await fetch(`${WM_API}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = Object.values(json?.query?.pages || {}) as any[];
    if (!pages.length) return [];

    const videos: VideoResult[] = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info || !info.mime?.startsWith('video/')) continue;

      const title = page.title?.replace(/^File:/, '') || 'Wikimedia Video';
      const duration = info.extmetadata?.Duration?.value || '0:00';
      const description = info.extmetadata?.ImageDescription?.value || info.extmetadata?.ObjectName?.value || '';

      videos.push({
        id: `wm_${page.pageid}`,
        source: 'wikimedia',
        sourceLabel: 'Wikimedia Commons',
        videoId: String(page.pageid),
        title,
        thumbnail: info.thumburl || info.url || '',
        duration: typeof duration === 'number' ? formatSeconds(duration) : String(duration || '0:00'),
        channelName: info.extmetadata?.Artist?.value || 'Wikimedia Commons',
        description: cleanHtml(String(description || '')),
        embedUrl: info.url || '',
        url: info.descriptionurl || page.canonicalurl || `https://commons.wikimedia.org/wiki/${page.title}`,
        relevance: 0,
      });
    }

    return videos.slice(0, maxResults);
  } catch (err) {
    logger.warn('Wikimedia search failed', { query, error: (err as Error).message });
    return [];
  }
}

async function searchYouTube(query: string, maxResults: number): Promise<VideoResult[]> {
  try {
    const ytSearch = require('yt-search');
    const r = await ytSearch(query);
    const videos = (r.videos || []).slice(0, maxResults);

    return videos.map((v: any, i: number) => ({
      id: `yt_${v.videoId}`,
      source: 'youtube' as const,
      sourceLabel: 'YouTube',
      videoId: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp || '0:00',
      channelName: v.author?.name || 'Unknown',
      description: v.description || '',
      embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      relevance: 1.0 - i * 0.15,
    }));
  } catch (err) {
    logger.warn('YouTube search failed', { query, error: (err as Error).message });
    return [];
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function cleanHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

export async function searchEducationalVideos(
  query: string,
  maxResults = 8,
): Promise<VideoResult[]> {
  logger.info('Searching educational videos', { query, maxResults });

  const [kaVideos, wmVideos, ytVideos] = await Promise.all([
    searchKhanAcademy(query, Math.ceil(maxResults / 2)),
    searchWikimedia(query, Math.ceil(maxResults / 3)),
    searchYouTube(query, maxResults),
  ]);

  const curatedSources = [...kaVideos, ...wmVideos];
  const allSources = curatedSources.length >= 3
    ? [...curatedSources, ...ytVideos]
    : [...ytVideos, ...curatedSources];

  const seen = new Set<string>();
  const unique = allSources.filter((v) => {
    const key = v.videoId || v.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const ranked = unique.slice(0, maxResults).map((v, i) => ({
    ...v,
    relevance: v.relevance || (1.0 - i * 0.12),
  }));

  logger.info('Educational video search complete', {
    query,
    totalFound: unique.length,
    sources: { khanAcademy: kaVideos.length, wikimedia: wmVideos.length, youtube: ytVideos.length },
  });

  return ranked;
}

export async function searchEducationalVideosForConcept(
  subject: string,
  conceptTitle: string,
  maxResults = 5,
): Promise<VideoResult[]> {
  const queries = [
    `${subject} ${conceptTitle}`,
    `${conceptTitle} tutorial`,
    `${conceptTitle} explained`,
  ];

  const allVideos: VideoResult[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const results = await searchEducationalVideos(q, maxResults);
    for (const v of results) {
      const key = v.videoId || v.id;
      if (!seen.has(key)) {
        seen.add(key);
        allVideos.push(v);
      }
    }
    if (allVideos.length >= maxResults * 2) break;
  }

  return allVideos.slice(0, maxResults);
}
