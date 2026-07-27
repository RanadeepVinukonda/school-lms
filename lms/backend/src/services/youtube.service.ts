import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';

import ytSearch from 'yt-search';

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export async function searchVideos(query: string, maxResults = 5) {
  try {
    const r = await timeout(ytSearch(query), 10000);
    const videos = r.videos.slice(0, maxResults);
    
    return videos.map((v, index) => {
      return {
        id: `yt_${v.videoId}`,
        youtubeId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail || '',
        duration: v.timestamp || '0:00',
        channelName: v.author?.name || 'Unknown Channel',
        description: v.description || '',
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        relevance: 1.0 - index * 0.15,
      };
    });
  } catch (error) {
    logger.error('yt-search failed, using AI fallback to generate mock videos.', { error });
    return generateMockVideos(query, maxResults);
  }
}

export async function searchVideosForConcept(subject: string, _chapterTitle: string, conceptTitle: string) {
  const query = `${subject} ${conceptTitle} tutorial`;
  const allVideos = await searchVideos(query, 3);
  const scored = allVideos.map((v: { title: string; description: string }) => {
    const title = v.title.toLowerCase();
    const desc = v.description.toLowerCase();
    const ct = conceptTitle.toLowerCase();
    let score = 0;
    if (title.includes(ct)) score += 3;
    if (desc.includes(ct)) score += 1;
    if (title.includes('tutorial') || title.includes('lesson')) score += 1;
    if (title.includes('introduction') || title.includes('basics')) score += 1;
    return { ...v, score };
  });
  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
  return scored.length > 0 ? [scored[0]] : [];
}

async function generateMockVideos(query: string, maxResults: number) {
  const prompt = `Generate ${maxResults} highly relevant educational YouTube video mock data for the query: "${query}".
Return ONLY valid JSON matching this schema:
{
  "videos": [
    {
      "youtubeId": "11_char_str",
      "title": "A realistic educational video title",
      "channelTitle": "A realistic educational channel name",
      "duration": "10:00",
      "description": "A short realistic description of the video."
    }
  ]
}`;
  try {
    const raw = await chatCompletion({
      messages: [{ role: 'system', content: 'You are a JSON API.' }, { role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1024,
      jsonMode: true
    });
    
    let parsed: any;
    let cleaned = raw.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleaned = match[1];
    
    parsed = JSON.parse(cleaned);
    const videos = parsed.videos || [];
    return videos.map((v: any, index: number) => {
      const vidId = v.youtubeId || Math.random().toString(36).substr(2, 11);
      return {
        id: `yt_${vidId}`,
        youtubeId: vidId,
        title: v.title || 'Educational Video',
        thumbnail: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
        duration: v.duration || '5:00',
        channelName: v.channelTitle || 'Education Channel',
        description: v.description || '',
        embedUrl: `https://www.youtube.com/embed/${vidId}`,
        relevance: 1.0 - index * 0.15,
      };
    });
  } catch (err) {
    logger.error('Failed to generate mock videos', { err });
    return [];
  }
}
