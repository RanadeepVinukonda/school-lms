// ---------------------------------------------------------------------------
// Script / language matching helpers for video relevance ranking.
// A concept like "phonetics" (English) must not rank a Hindi-language video
// ("हिंदी ध्वन्यात्मकता") highly just because the embedding overlaps. We detect
// the dominant script of the concept text and penalize videos whose title is
// predominantly in a different script, plus measure lexical term overlap.
// ---------------------------------------------------------------------------

const INDIC_RE = /[\u0900-\u0DFF]/g; // Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, etc.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/g;
const CJK_RE = /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g;
const LATIN_RE = /[A-Za-z]/g;

function count(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

/** True when the text is predominantly written in Latin (English) script. */
export function isLatinScript(text: string): boolean {
  const latin = count(text, LATIN_RE);
  const nonLatin = count(text, INDIC_RE) + count(text, ARABIC_RE) + count(text, CJK_RE);
  if (latin === 0) return false;
  return latin >= nonLatin;
}

/** ISO 639-1 relevance language hint for the YouTube Data API search. */
export function relevanceLanguageFor(text: string): string | undefined {
  const latin = count(text, LATIN_RE);
  const indic = count(text, INDIC_RE);
  if (indic > 0 && indic >= latin) return 'hi';
  if (latin === 0) return undefined;
  return 'en';
}

/**
 * Multiplier (0..1) that penalizes a video whose title is written in a
 * different script than the concept. Returns 1 when scripts agree, a small
 * value (0.1) when a Latin (English) concept is matched to a predominantly
 * Indic/Arabic/CJK video title, and a mid penalty for mixed titles.
 */
export function scriptPenalty(title: string, conceptText: string): number {
  if (!title) return 1;
  if (!isLatinScript(conceptText)) return 1; // only enforce when concept is Latin-based

  const indic = count(title, INDIC_RE);
  const arabic = count(title, ARABIC_RE);
  const cjk = count(title, CJK_RE);
  const latin = count(title, LATIN_RE);
  const foreign = indic + arabic + cjk;

  if (foreign === 0) return 1;
  const totalAlpha = latin + foreign;
  if (totalAlpha === 0) return 1;

  const foreignRatio = foreign / totalAlpha;
  if (foreignRatio > 0.5) return 0.1; // predominantly a foreign script
  if (foreignRatio > 0.25) return 0.4;
  return 0.8;
}

/** Fraction of concept tokens (>=3 chars) that appear verbatim in the title. */
export function lexicalOverlap(title: string, conceptText: string): number {
  const tokens = new Set(
    conceptText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );
  if (tokens.size === 0) return 0;

  const titleLower = title.toLowerCase();
  let hit = 0;
  for (const tok of tokens) {
    // word-boundary-ish match: token present in the title
    if (new RegExp(`(^|[^a-z0-9])${tok}([^a-z0-9]|$)`).test(titleLower)) hit++;
  }
  return hit / tokens.size;
}
