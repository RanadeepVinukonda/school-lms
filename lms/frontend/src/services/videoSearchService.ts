import api from './api';

export interface EducationalVideo {
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

export async function searchVideos(query: string, maxResults = 8): Promise<EducationalVideo[]> {
  const res = await api.get('/api/educational-video/search', {
    params: { query, maxResults },
  });
  return res.data?.data || [];
}

export async function searchVideosForConcept(
  subject: string,
  conceptTitle: string,
  maxResults = 5,
): Promise<EducationalVideo[]> {
  const res = await api.post('/api/educational-video/search-concept', {
    subject,
    conceptTitle,
    maxResults,
  });
  return res.data?.data || [];
}
