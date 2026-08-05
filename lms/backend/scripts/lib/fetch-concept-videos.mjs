/**
 * Concept video enrichment — Khan Academy prioritized, YouTube fallback.
 *
 * For every concept this fetches, in priority order:
 *   1. Khan Academy videos (the Khan Academy YouTube channel, searched via
 *      yt-search — no API key required). Always scored above YouTube.
 *   2. The concept's own authoritative `video_links` (YouTube), highest of
 *      the YouTube tier.
 *   3. General YouTube search results (relevance-filtered) to fill the rest.
 *
 * Scores are written into `concept_videos.score` so the Teach page (which
 * orders by `score desc`) always shows Khan Academy first, then YouTube.
 * Idempotent: rows for the processed concepts are deleted and re-inserted.
 */

import { randomUUID } from 'node:crypto';

const KHAN_ACADEMY_CHANNELS = ['Khan Academy', 'Khan Academy India', 'Khan Academy India - English'];

let ytSearchPromise;
function getYtSearch() {
  if (!ytSearchPromise) {
    ytSearchPromise = import('yt-search').then((m) => m.default || m.search);
  }
  return ytSearchPromise;
}

function isRelevant(title, terms) {
  const t = String(title || '').toLowerCase();
  const list = (terms || [])
    .flatMap((x) => String(x || '').split(/[\s,()]+/))
    .map((x) => x.toLowerCase())
    .filter((x) => x.length > 3);
  if (!list.length) return true;
  return list.some((term) => t.includes(term));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

async function khanAcademyChannelSearch(query, maxResults) {
  try {
    const ytSearch = await getYtSearch();
    const r = await withTimeout(ytSearch(query), 15000, `khan search "${query}"`);
    return (r.videos || [])
      .filter((v) =>
        KHAN_ACADEMY_CHANNELS.some((ch) =>
          (v.author?.name || '').toLowerCase().includes(ch.toLowerCase()),
        ),
      )
      .slice(0, maxResults)
      .map((v) => ({
        videoId: v.videoId,
        title: v.title,
        description: v.description || '',
        duration: v.timestamp || '0:00',
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
        channel: v.author?.name || 'Khan Academy',
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        source: 'khan_academy',
        sourceLabel: 'Khan Academy',
      }));
  } catch {
    return [];
  }
}

async function youtubeSearch(query, maxResults) {
  try {
    const ytSearch = await getYtSearch();
    const r = await withTimeout(ytSearch(query), 15000, `youtube search "${query}"`);
    return (r.videos || [])
      .slice(0, maxResults)
      .map((v) => ({
        videoId: v.videoId,
        title: v.title,
        description: v.description || '',
        duration: v.timestamp || '0:00',
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
        channel: v.author?.name || 'Unknown',
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        source: 'youtube',
        sourceLabel: 'YouTube',
      }));
  } catch {
    return [];
  }
}

function youtubeIdFromLink(link) {
  const m = String(link).match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : null;
}

/**
 * Fetch Khan Academy + YouTube videos for one concept, scored so Khan Academy
 * always outranks YouTube.
 */
export async function fetchConceptVideos(concept, opts = {}) {
  const {
    maxKhan = 3,
    maxYouTube = 3,
    maxPerConcept = 6,
  } = opts;

  const subjectName = concept.subject_name || '';
  const queries = [
    `${concept.title} ${subjectName}`.trim(),
    String(concept.title || '').trim(),
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, ' '))
    .slice(0, 2);

  const terms = [subjectName, concept.chapter, concept.title];
  const seen = new Set();
  const khan = [];
  const youtube = [];

  const pushKhan = (v) => {
    if (!v?.videoId || seen.has(v.videoId)) return;
    if (!isRelevant(v.title, terms)) return;
    seen.add(v.videoId);
    khan.push(v);
  };
  const pushYoutube = (v, forced = false) => {
    if (!v?.videoId || seen.has(v.videoId)) return;
    if (!forced && !isRelevant(v.title, terms)) return;
    seen.add(v.videoId);
    youtube.push(v);
  };

  // 1. Khan Academy (highest priority)
  for (const q of queries) {
    for (const v of await khanAcademyChannelSearch(q, maxKhan * 2)) pushKhan(v);
  }

  // 2. Authoritative video_links → top of the YouTube tier
  for (const link of (concept.video_links || [])) {
    const videoId = youtubeIdFromLink(link);
    if (videoId) {
      pushYoutube({
        videoId,
        title: concept.title,
        description: '',
        duration: '',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channel: 'YouTube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        source: 'youtube',
        sourceLabel: 'YouTube',
      }, true);
    }
  }

  // 3. General YouTube to fill remaining slots (stop once enough found)
  for (const q of queries) {
    if (youtube.length >= maxYouTube) break;
    for (const v of await youtubeSearch(q, maxYouTube * 3)) pushYoutube(v);
  }

  return [
    ...khan.slice(0, maxKhan).map((v, i) => ({ ...v, score: +(1.0 - i * 0.03).toFixed(3) })),
    ...youtube.slice(0, maxYouTube).map((v, i) => ({ ...v, score: +(0.84 - i * 0.03).toFixed(3) })),
  ].slice(0, maxPerConcept);
}

const COLS = ['id','concept_id','textbook_id','chapter_id','school_id','video_id','title','description','channel','thumbnail','duration','score','data'];

/**
 * Replace `concept_videos` rows for the given concepts with live-fetched
 * Khan Academy + YouTube videos. Failed concepts are left untouched.
 */
export async function syncConceptVideosForConcepts(client, concepts, opts = {}) {
  const succeeded = [];
  const failed = [];
  for (const cpt of concepts) {
    if (opts.onProgress) opts.onProgress(cpt);
    try {
      const videos = await fetchConceptVideos(cpt, opts);
      succeeded.push({ concept: cpt, videos });
    } catch (e) {
      failed.push({ concept: cpt, error: (e && e.message) || String(e) });
    }
  }

  const rows = [];
  for (const { concept, videos } of succeeded) {
    for (const v of videos) {
      rows.push({
        id: randomUUID(),
        concept_id: concept.id,
        textbook_id: concept.textbook_id,
        chapter_id: concept.chapter_id,
        school_id: concept.school_id,
        video_id: v.videoId,
        title: v.title,
        description: v.description || '',
        channel: v.channel || v.sourceLabel,
        thumbnail: v.thumbnail,
        duration: v.duration || '',
        score: v.score,
        data: JSON.stringify({
          source: v.source,
          sourceLabel: v.sourceLabel,
          url: v.url,
          embedUrl: v.embedUrl,
        }),
      });
    }
  }

  if (succeeded.length) {
    await client.query(
      `DELETE FROM public.concept_videos WHERE concept_id = ANY($1::uuid[])`,
      [succeeded.map((s) => s.concept.id)],
    );
  }

  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = [];
    const placeholders = [];
    for (const row of chunk) {
      const rowPh = COLS.map((cn) => {
        params.push(row[cn]);
        return `$${params.length}`;
      });
      placeholders.push(`(${rowPh.join(', ')})`);
    }
    await client.query(
      `INSERT INTO public.concept_videos (${COLS.map((cn) => `"${cn}"`).join(', ')}) VALUES ${placeholders.join(', ')}`,
      params,
    );
  }

  return {
    summary: succeeded.map(({ concept, videos }) => ({
      id: concept.id,
      concept: concept.title,
      khan: videos.filter((v) => v.source === 'khan_academy').length,
      youtube: videos.filter((v) => v.source === 'youtube').length,
      total: videos.length,
    })),
    failed: failed.map(({ concept, error }) => ({ id: concept.id, concept: concept.title, error })),
  };
}
