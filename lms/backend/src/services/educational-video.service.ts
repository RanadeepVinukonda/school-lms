import { logger } from '../utils/logger';
import { youtubeApiSearch, searchKhanAcademyViaApi, YtApiVideo } from './youtube-data-api.service';
import { tokenize, countKeywordHits } from '../utils/relevance';

const KA_GRAPHQL = 'https://www.khanacademy.org/api/internal/graphql';
const WM_API = 'https://commons.wikimedia.org/w/api.php';

// Non-educational content blacklists — channels and title patterns that are
// entertainment, music, gaming, news, or otherwise not classroom-appropriate.
const NON_EDUCATIONAL_CHANNELS = new Set([
  'mrbeast', 'pewdiepie', 'markiplier', 'jacksepticeye', 'dantdm',
  'logan paul', 'jake paul', 'kylie jenner', 'kim kardashian',
  'eminem', 'drake', 'ariana grande', 'justin bieber', 'taylor swift',
  'bts', 'blackpink', 'bad bunny', 'shakira', 'rihanna',
]);

const NON_EDUCATIONAL_TITLE_PATTERNS = [
  /\b(song|music video|lyrics?|official video|remix|mv|album)\b/i,
  /\b(vlog|prank|challenge|reaction|unboxing|mukbang|asmr)\b/i,
  /\b(gaming|gameplay|let's play|fortnite|minecraft|gta)\b/i,
  /\b(news|breaking|trump|biden|election|celebrity|gossip)\b/i,
  /\b(funny|comedy|stand[- ]?up|roast|diss track)\b/i,
  /\b(motivational|inspirational|self[- ]?help|hustle)\b/i,
  /\b(beat|instrumental|acoustic|live performance|concert)\b/i,
];

/** Returns true if the video looks educational and classroom-safe. */
function isEducationalContent(video: { title: string; channelName?: string; description?: string }): boolean {
  const channel = (video.channelName || '').toLowerCase();

  // Block known non-educational channels
  if (NON_EDUCATIONAL_CHANNELS.has(channel)) return false;

  // Block videos matching non-educational title patterns
  for (const pattern of NON_EDUCATIONAL_TITLE_PATTERNS) {
    if (pattern.test(video.title)) return false;
  }

  return true;
}

/** Ensure search queries always bias toward educational content. */
function ensureEducationalQuery(query: string): string {
  const lower = query.toLowerCase();
  const educationalTerms = ['tutorial', 'explained', 'lesson', 'lecture', 'educational', 'learn', 'class', 'study', 'concept', 'definition', 'examples'];
  const hasEduTerm = educationalTerms.some((t) => lower.includes(t));
  if (hasEduTerm) return query;
  return `${query} educational tutorial`;
}

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

function fromApiVideo(v: YtApiVideo, source: 'khan_academy' | 'youtube', sourceLabel: string): VideoResult {
  return {
    id: `${source === 'khan_academy' ? 'ka' : 'yt'}_${v.videoId}`,
    source,
    sourceLabel,
    videoId: v.videoId,
    title: v.title,
    thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    duration: v.duration || '0:00',
    channelName: source === 'khan_academy' ? 'Khan Academy' : v.channelTitle || 'YouTube',
    description: v.description || '',
    embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    relevance: 1.0,
  };
}

async function searchKhanAcademy(query: string, maxResults: number): Promise<VideoResult[]> {
  // Official YouTube Data API search over Khan Academy channels first (reliable).
  try {
    const apiResults = await searchKhanAcademyViaApi(query, maxResults);
    if (apiResults.length > 0) {
      return apiResults.map((v) => fromApiVideo(v, 'khan_academy', 'Khan Academy'));
    }
  } catch (err) {
    logger.warn('Khan Academy YouTube API search failed, falling back to GraphQL', { query, error: (err as Error).message });
  }

  try {
    const body = JSON.stringify({
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
    });

    const res = await fetch(KA_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn('Khan Academy API rejected request', { query, status: res.status });
      return [];
    }

    const json = await res.json();
    const results = json?.data?.search?.results || [];
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
  const eduQuery = ensureEducationalQuery(query);
  // Fetch extra to compensate for educational filter removing non-relevant results
  const fetchCount = maxResults * 3;

  // yt-search first (free); the official YouTube Data API is the rescue path
  // when scraping is blocked, so we do not spend daily API quota unnecessarily.
  const ytSearch = require('yt-search');
  try {
    const r = await ytSearch(eduQuery);
    const videos = (r.videos || [])
      .filter((v: any) => isEducationalContent({ title: v.title, channelName: v.author?.name }))
      .slice(0, maxResults);

    if (videos.length > 0) {
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
    }
    logger.warn('yt-search returned no educational results; falling back to YouTube Data API', { query: eduQuery });
  } catch (err) {
    logger.warn('YouTube search failed; falling back to YouTube Data API', { query: eduQuery, error: (err as Error).message });
  }

  try {
    const apiResults = await youtubeApiSearch({ query: eduQuery, maxResults: fetchCount });
    return apiResults
      .filter((v) => isEducationalContent({ title: v.title, channelName: v.channelTitle }))
      .slice(0, maxResults)
      .map((v) => fromApiVideo(v, 'youtube', 'YouTube'));
  } catch (err) {
    logger.warn('YouTube Data API search failed', { query: eduQuery, error: (err as Error).message });
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

export async function searchYouTubeOnly(
  query: string,
  maxResults = 8,
): Promise<VideoResult[]> {
  return searchYouTube(query, maxResults);
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
  }).filter((v) => {
    // Final safety net: only keep educational content across all sources
    if (v.source === 'khan_academy' || v.source === 'wikimedia') return true;
    return isEducationalContent({ title: v.title, channelName: v.channelName });
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

  const conceptKeywords = tokenize(conceptTitle);
  const subjectKeywords = tokenize(subject);

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

  // Relevance gate: a video is kept when its title shares at least one real
  // topic keyword with the concept, or the whole phrase appears. This stops
  // unrelated videos returned by a loose search query from being attached to
  // the concept just because a single word matched.
  const relevant = allVideos
    .map((v) => {
      const titleHits = countKeywordHits(v.title, conceptKeywords);
      const phrase = conceptTitle.toLowerCase();
      const phraseHit = phrase.length >= 6 && (v.title.toLowerCase().includes(phrase) || v.description.toLowerCase().includes(phrase));
      return { v, titleHits, phraseHit, score: titleHits * 3 + (countKeywordHits(v.title, subjectKeywords) > 0 ? 1 : 0) + (phraseHit ? 4 : 0) };
    })
    .filter(({ titleHits, phraseHit, score }) => {
      if (titleHits >= 1 || phraseHit) return true;
      // Concept with only generic words: fall back to a reasonable score.
      if (conceptKeywords.length === 0) return score >= 2;
      return false;
    })
    .sort((a, b) => b.score - a.score);

  return relevant.slice(0, maxResults).map(({ v }) => v);
}
