import * as educationalVideoService from './educational-video.service';

export interface TeachResource {
  id: string;
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

export async function searchTeachResources(
  subject: string,
  chapterTitle: string,
  conceptTitle: string,
  keywords: string[] = [],
  maxResults = 6,
): Promise<TeachResource[]> {
  const queries = [
    ...(keywords.length > 0 ? keywords.slice(0, 3).map((k) => `${subject} ${conceptTitle} ${k}`) : []),
    `${subject} ${conceptTitle}`,
    `${conceptTitle} ${chapterTitle}`,
    `${conceptTitle} tutorial`,
    `${conceptTitle} explained`,
  ];

  const seen = new Set<string>();
  const khanResults: TeachResource[] = [];
  const youtubeResults: TeachResource[] = [];

  for (const q of queries) {
    if (khanResults.length >= maxResults) break;

    const allResults = await educationalVideoService.searchEducationalVideos(q, maxResults);

    for (const r of allResults) {
      const key = r.videoId || r.id;
      if (seen.has(key)) continue;
      seen.add(key);

      const resource: TeachResource = {
        id: r.id,
        source: r.source === 'khan_academy' ? 'khan_academy' : 'youtube',
        sourceLabel: r.source === 'khan_academy' ? 'Khan Academy' : 'YouTube',
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration,
        channelName: r.channelName,
        description: r.description,
        url: r.url,
        embedUrl: r.embedUrl,
        relevance: r.relevance,
      };

      if (r.source === 'khan_academy') {
        khanResults.push(resource);
      } else if (r.source === 'youtube' && khanResults.length < maxResults) {
        youtubeResults.push(resource);
      }
    }
  }

  khanResults.sort((a, b) => b.relevance - a.relevance);
  youtubeResults.sort((a, b) => b.relevance - a.relevance);

  if (khanResults.length >= 2) {
    return khanResults.slice(0, maxResults);
  }

  const combined = [...khanResults, ...youtubeResults];
  return combined.slice(0, maxResults);
}
