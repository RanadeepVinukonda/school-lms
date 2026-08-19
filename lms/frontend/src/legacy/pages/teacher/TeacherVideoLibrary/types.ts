export interface TeacherVideo {
  id: string;
  videoId: string;
  youtubeId?: string;
  source: string;
  sourceLabel: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  url?: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  createdAt?: string;
}

export interface YouTubeSearchResult {
  id: string;
  youtubeId: string;
  source: string;
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

export interface EducationalVideoSearchResult {
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
