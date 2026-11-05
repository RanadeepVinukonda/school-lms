export interface TeacherVideo {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  textbookId?: string;
  chapterId?: string;
  conceptId?: string;
  createdAt?: string;
}

export interface YouTubeSearchResult {
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
}
