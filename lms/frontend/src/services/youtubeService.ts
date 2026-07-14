import api from './api';

export interface YouTubeVideo {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  relevance: number;
}

/** Search YouTube for educational videos matching a query. Returns up to maxResults videos. */
export async function searchVideos(query: string, maxResults = 5): Promise<YouTubeVideo[]> {
  const res = await api.get('/youtube/search', {
    params: { query, maxResults },
  });
  return res.data?.data || [];
}

/** Search for the best video matching a textbook concept (subject + chapter + concept). */
export async function searchVideosForConcept(subject: string, chapterTitle: string, conceptTitle: string): Promise<YouTubeVideo[]> {
  const res = await api.post('/youtube/search-concept', {
    subject,
    chapterTitle,
    conceptTitle,
  });
  return res.data?.data || [];
}
