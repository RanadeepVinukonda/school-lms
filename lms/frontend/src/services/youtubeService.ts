const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

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

function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  const h = hours ? parseInt(hours) : 0;
  const m = minutes ? parseInt(minutes) : 0;
  const s = seconds ? parseInt(seconds) : 0;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function searchVideos(query: string, maxResults = 5): Promise<YouTubeVideo[]> {
  const searchUrl = `${YOUTUBE_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&videoEmbeddable=true&key=${YOUTUBE_API_KEY}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const err = await searchRes.text();
    throw new Error(`YouTube search failed: ${err}`);
  }

  const searchData = await searchRes.json();
  const videoIds = searchData.items?.map((i: { id: { videoId: string } }) => i.id.videoId).join(',') || '';

  if (!videoIds) return [];

  const detailsUrl = `${YOUTUBE_BASE}/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) return [];

  const detailsData = await detailsRes.json();

  return searchData.items?.map((item: {
    id: { videoId: string };
    snippet: { title: string; thumbnails: { high?: { url: string }; default?: { url: string } }; channelTitle: string; description: string };
  }, index: number) => {
    const detail = detailsData.items?.[index];
    return {
      id: `yt_${item.id.videoId}`,
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      duration: detail ? parseDuration(detail.contentDetails.duration) : '0:00',
      channelName: item.snippet.channelTitle,
      description: item.snippet.description.slice(0, 200),
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      relevance: 1.0 - index * 0.15,
    };
  }) || [];
}

export async function searchVideosForConcept(subject: string, chapterTitle: string, conceptTitle: string): Promise<YouTubeVideo[]> {
  const query = `${subject} ${conceptTitle} tutorial`;

  const allVideos = await searchVideos(query, 3);
  const scored = allVideos.map((v) => {
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

  scored.sort((a, b) => b.score - a.score);

  return scored.length > 0 ? [scored[0]] : [];
}
