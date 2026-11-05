import { describe, it, expect } from 'vitest';
import {
  detectResourceKind,
  detectDocumentKind,
  extractYouTubeId,
  youtubeThumbnailCandidates,
  preferredThumbnail,
  formatDuration,
  hostnameOf,
  actionLabelForKind,
} from '@/lib/resourceUtils';

describe('detectResourceKind', () => {
  it('detects youtube videos from url / videoId / source', () => {
    expect(detectResourceKind({ url: 'https://www.youtube.com/watch?v=abc123' })).toBe('video');
    expect(detectResourceKind({ url: 'https://youtu.be/abc123' })).toBe('video');
    expect(detectResourceKind({ videoId: 'abc123' })).toBe('video');
    expect(detectResourceKind({ source: 'youtube' })).toBe('video');
  });

  it('detects khan academy', () => {
    expect(detectResourceKind({ source: 'khan_academy' })).toBe('khan_academy');
    expect(detectResourceKind({ url: 'https://www.khanacademy.org/math/cc-third-grade-math' })).toBe('khan_academy');
  });

  it('detects pdfs', () => {
    expect(detectResourceKind({ url: 'https://example.com/file.pdf' })).toBe('pdf');
    expect(detectResourceKind({ url: 'https://example.com/file.pdf?download=1' })).toBe('pdf');
  });

  it('detects images', () => {
    expect(detectResourceKind({ url: 'https://example.com/diagram.png' })).toBe('image');
    expect(detectResourceKind({ url: 'https://example.com/photo.jpeg?x=1' })).toBe('image');
  });

  it('detects google docs and office documents', () => {
    expect(detectResourceKind({ url: 'https://docs.google.com/document/d/xyz' })).toBe('document');
    expect(detectResourceKind({ url: 'https://example.com/notes.docx' })).toBe('document');
    expect(detectResourceKind({ url: 'https://example.com/slides.pptx' })).toBe('document');
    expect(detectResourceKind({ url: 'https://example.com/data.xlsx' })).toBe('document');
  });

  it('falls back to external for unknown links', () => {
    expect(detectResourceKind({ url: 'https://www.nasa.gov/about' })).toBe('external');
  });
});

describe('detectDocumentKind', () => {
  it('classifies google docs / slides / sheets', () => {
    expect(detectDocumentKind({ url: 'https://docs.google.com/document/d/1' })).toBe('gdocs');
    expect(detectDocumentKind({ url: 'https://docs.google.com/presentation/d/1' })).toBe('gslides');
    expect(detectDocumentKind({ url: 'https://docs.google.com/spreadsheets/d/1' })).toBe('gsheets');
  });
  it('classifies office extensions', () => {
    expect(detectDocumentKind({ url: 'https://e.com/a.docx' })).toBe('word');
    expect(detectDocumentKind({ url: 'https://e.com/a.pptx' })).toBe('powerpoint');
    expect(detectDocumentKind({ url: 'https://e.com/a.xlsx' })).toBe('excel');
  });
});

describe('extractYouTubeId', () => {
  it('extracts ids from common shapes', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.nasa.gov')).toBeNull();
  });
});

describe('thumbnails', () => {
  it('builds candidate list in resolution order', () => {
    expect(youtubeThumbnailCandidates('abc123')).toEqual([
      'https://i.ytimg.com/vi/abc123/hq720.jpg',
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
      'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
    ]);
  });
  it('prefers an explicit thumbnail', () => {
    expect(preferredThumbnail({ thumbnail: 'https://cdn/x.jpg', videoId: 'abc' })).toBe('https://cdn/x.jpg');
  });
  it('derives thumbnail from videoId when missing', () => {
    expect(preferredThumbnail({ videoId: 'abc123' })).toBe('https://i.ytimg.com/vi/abc123/hq720.jpg');
  });
});

describe('formatDuration', () => {
  it('passes through mm:ss', () => {
    expect(formatDuration('12:34')).toBe('12:34');
  });
  it('converts ISO 8601 durations', () => {
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03');
    expect(formatDuration('PT5M')).toBe('5:00');
  });
  it('returns empty for missing', () => {
    expect(formatDuration('')).toBe('');
    expect(formatDuration(null)).toBe('');
  });
});

describe('helpers', () => {
  it('extracts hostnames without www', () => {
    expect(hostnameOf('https://www.khanacademy.org/math')).toBe('khanacademy.org');
    expect(hostnameOf('https://example.com')).toBe('example.com');
  });
  it('maps kind to an action label', () => {
    expect(actionLabelForKind('video')).toBe('Watch Now');
    expect(actionLabelForKind('pdf')).toBe('Open PDF');
    expect(actionLabelForKind('khan_academy')).toBe('Open Lesson');
  });
});
