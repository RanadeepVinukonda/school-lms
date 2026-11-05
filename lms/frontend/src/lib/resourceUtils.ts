export type ResourceKind =
  | 'video'
  | 'khan_academy'
  | 'pdf'
  | 'image'
  | 'document'
  | 'external';

export type DocumentKind = 'word' | 'powerpoint' | 'excel' | 'gdocs' | 'gsheets' | 'gslides' | 'file';

export interface DetectableResource {
  id?: string | null;
  source?: string | null;
  sourceLabel?: string | null;
  url?: string | null;
  videoId?: string | null;
  thumbnail?: string | null;
  title?: string | null;
  description?: string | null;
  duration?: string | null;
  channelName?: string | null;
  conceptTitle?: string | null;
  size?: number | null;
}

/** Extract a YouTube video id from common URL shapes. */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/** Strip query/hash for extension and hostname checks. */
function cleanUrl(url?: string | null): string {
  return (url || '').split(/[?#]/)[0].toLowerCase();
}

/** Detect the resource kind from its metadata + url. */
export function detectResourceKind(r: DetectableResource): ResourceKind {
  const url = (r.url || '').toLowerCase();
  const source = (r.source || '').toLowerCase();
  const label = (r.sourceLabel || '').toLowerCase();

  if (source === 'khan_academy' || label.includes('khan') || /khanacademy\.org/.test(url)) return 'khan_academy';
  if (source === 'youtube' || label.includes('youtube') || r.videoId || /(youtube\.com|youtu\.be)/.test(url)) return 'video';
  if (cleanUrl(r.url).endsWith('.pdf')) return 'pdf';
  if (/\.[a-z]+($)/.test(cleanUrl(r.url)) && /\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/.test(cleanUrl(r.url))) return 'image';
  if (/(docs\.google\.com|drive\.google\.com)/.test(url)) return 'document';
  if (/\.(docx?|doc|pptx?|ppt|xlsx?|xls|odt|ods|rtf|txt)$/.test(cleanUrl(r.url))) return 'document';
  return 'external';
}

/** Sub-type for document resources (Word/PPT/Excel/GDocs/etc). */
export function detectDocumentKind(r: DetectableResource): DocumentKind {
  const url = (r.url || '').toLowerCase();
  if (/docs\.google\.com\/document/.test(url)) return 'gdocs';
  if (/docs\.google\.com\/spreadsheets/.test(url)) return 'gsheets';
  if (/docs\.google\.com\/presentation/.test(url)) return 'gslides';
  if (/\.docx?$/.test(cleanUrl(r.url))) return 'word';
  if (/\.pptx?$/.test(cleanUrl(r.url))) return 'powerpoint';
  if (/\.xlsx?$/.test(cleanUrl(r.url))) return 'excel';
  return 'file';
}

/** Reliable YouTube thumbnail candidates (most → least resolution). */
export function youtubeThumbnailCandidates(videoId?: string | null): string[] {
  if (!videoId) return [];
  return [
    `https://i.ytimg.com/vi/${videoId}/hq720.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  ];
}

/** Best first-choice thumbnail for a resource. */
export function preferredThumbnail(r: DetectableResource): string | null {
  if (r.thumbnail) return r.thumbnail;
  const kind = detectResourceKind(r);
  if (kind === 'video') {
    const id = r.videoId || extractYouTubeId(r.url);
    const candidates = youtubeThumbnailCandidates(id);
    return candidates[0] || null;
  }
  if (kind === 'image' && r.url) return r.url;
  return null;
}

/** Fallback thumbnails to try when the preferred image fails to load. */
export function thumbnailFallbacks(r: DetectableResource): string[] {
  const kind = detectResourceKind(r);
  if (kind === 'video') {
    const id = r.videoId || extractYouTubeId(r.url);
    return youtubeThumbnailCandidates(id).slice(1);
  }
  if (kind === 'image' && r.url) return [r.url];
  return [];
}

/** Domain (host) of a url, lower-cased, without www. */
export function hostnameOf(url?: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  }
}

/** Favicon URL for external-site preview cards. */
export function faviconUrl(url?: string | null): string | null {
  const host = hostnameOf(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

/** Format a duration like "12:34" or "1:02:03". */
export function formatDuration(duration?: string | null): string {
  if (!duration) return '';
  const trimmed = String(duration).trim();
  if (!trimmed) return '';
  if (/^\d{1,2}:\d{2}$/.test(trimmed) || /^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (m) {
    const h = m[1] ? +m[1] : 0;
    const min = m[2] ? +m[2] : 0;
    const s = m[3] ? +m[3] : 0;
    const hh = h > 0 ? `${h}:` : '';
    return `${hh}${String(min).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
  }
  return trimmed;
}

/** Rough file-size label from a length or a url (bytes → KB/MB). */
export function formatFileSize(bytes?: number | null): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Material-icon name per resource kind (used by the fallback artwork). */
export function iconNameForKind(kind: ResourceKind): string {
  switch (kind) {
    case 'video': return 'play_circle';
    case 'khan_academy': return 'school';
    case 'pdf': return 'picture_as_pdf';
    case 'image': return 'image';
    case 'document': return 'description';
    case 'external': return 'language';
  }
}

/** Human label per resource kind. */
export function labelForKind(kind: ResourceKind): string {
  switch (kind) {
    case 'video': return 'Video';
    case 'khan_academy': return 'Khan Academy';
    case 'pdf': return 'PDF';
    case 'image': return 'Image';
    case 'document': return 'Document';
    case 'external': return 'Link';
  }
}

/** Label + accent gradient for document sub-types. */
export function documentArt(doc: DocumentKind): { label: string; gradient: string } {
  switch (doc) {
    case 'word': return { label: 'Word', gradient: 'from-blue-600 to-blue-400' };
    case 'powerpoint': return { label: 'PowerPoint', gradient: 'from-orange-600 to-amber-400' };
    case 'excel': return { label: 'Excel', gradient: 'from-green-600 to-emerald-400' };
    case 'gdocs': return { label: 'Google Docs', gradient: 'from-blue-500 to-indigo-400' };
    case 'gsheets': return { label: 'Google Sheets', gradient: 'from-green-500 to-teal-400' };
    case 'gslides': return { label: 'Google Slides', gradient: 'from-yellow-500 to-orange-400' };
    case 'file': return { label: 'Document', gradient: 'from-slate-600 to-slate-400' };
  }
}

/** Button label for the primary action per kind. */
export function actionLabelForKind(kind: ResourceKind): string {
  switch (kind) {
    case 'video': return 'Watch Now';
    case 'khan_academy': return 'Open Lesson';
    case 'pdf': return 'Open PDF';
    case 'image': return 'View Image';
    case 'document': return 'Open Document';
    case 'external': return 'Visit Site';
  }
}
