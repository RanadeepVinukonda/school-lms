/**
 * Shared lexical relevance helpers used by the video / resource rankers.
 *
 * Kept dependency-free so any search service (video-ranker, youtube, teach
 * resources) can reuse the same stop-word list and word-boundary matcher,
 * avoiding "one shared word in the title" false positives.
 */

export const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of',
  'on', 'or', 'the', 'to', 'was', 'with', 'within', 'without',
  'unit', 'units', 'chapter', 'chapters', 'lesson', 'lessons', 'class', 'classes', 'classroom',
  'grade', 'grades', 'school', 'schools', 'course', 'curriculum',
  'video', 'videos', 'tutorial', 'tutorials', 'intro', 'introduction', 'basics', 'basic',
  'part', 'parts', 'example', 'examples', 'learn', 'learning', 'learned', 'explained',
  'explanation', 'what', 'how', 'why', 'all', 'about', 'this', 'that', 'these', 'those',
  'you', 'your', 'student', 'students', 'teacher', 'teachers', 'year', 'years', 'term', 'terms',
  'board', 'ncert', 'cbse', 'icse', 'igcse', 'gseb', 'syllabus',
]);

/** Split text into meaningful lowercase keywords (length >= 3, not stop words). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Word-boundary (non-alphanumeric separated) substring match. */
export function containsWord(text: string, word: string): boolean {
  if (!word) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}([^a-z0-9]|$)`).test(text);
}

/** Count how many of the given keywords appear as whole words in `text`. */
export function countKeywordHits(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (containsWord(lower, kw)) hits++;
  }
  return hits;
}
