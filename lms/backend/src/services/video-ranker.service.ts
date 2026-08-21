import { searchEducationalVideos } from './educational-video.service';
import { getEmbedding, cosineSimilarity } from './transformers.service';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';
import { tokenize, countKeywordHits } from '../utils/relevance';

// Minimum cosine similarity for a video to be considered relevant. Below this
// a video only survives if its title shares real keywords with the concept
// (a single shared word like "math" must not pull in an unrelated video).
const MIN_SEMANTIC_SCORE = 0.28;
// A video kept on a single title-keyword hit must be at least loosely on
// topic semantically — one shared word alone is not enough.
const MIN_SINGLE_KEYWORD_SEMANTIC = 0.2;
// Tie-break bonus for curated sources (Khan Academy) applied after relevance.
const KHAN_BONUS = 0.05;
// Boost added per distinct concept keyword found in the video title. Applied
// on top of the semantic score so exact-topic videos outrank loose matches.
const TITLE_KEYWORD_BOOST = 0.09;
const DESC_KEYWORD_BOOST = 0.03;

async function generateSearchQueries(conceptTitle: string, subjectName: string, chapterTitle?: string): Promise<string[]> {
  const chapterContext = chapterTitle ? ` (chapter: "${chapterTitle}")` : '';
  try {
    const rawResponse = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant. Output 4 distinct, highly relevant educational video search queries for a student trying to learn the concept. Queries MUST be about the specific concept topic, not the chapter or subject in general. Output ONLY as a raw JSON string array, like: ["query 1", "query 2"]',
        },
        {
          role: 'user',
          content: `Concept: "${conceptTitle}"${chapterContext} under subject "${subjectName}"`,
        },
      ],
      temperature: 0.3,
      jsonMode: true,
    });

    let cleaned = rawResponse.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleaned = match[1];

    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(String);
    }
  } catch (err) {
    logger.warn('Failed to generate search queries using LLM, using fallbacks', { conceptTitle, err });
  }

  return [
    `${conceptTitle} ${subjectName} tutorial`,
    `${conceptTitle} explained`,
    `${conceptTitle} examples lesson`,
    `${conceptTitle} for beginners`,
  ];
}

// Deterministic last-resort queries used when the primary queries returned an
// empty pool (scraping blocked, quota exhausted, transient failures).
function fallbackQueries(conceptTitle: string, subjectName: string, chapterTitle?: string): string[] {
  return [
    `${conceptTitle} explained`,
    `${conceptTitle} ${chapterTitle || ''} ${subjectName}`.replace(/\s+/g, ' ').trim(),
    `what is ${conceptTitle}`,
  ].filter(Boolean);
}

export async function searchAndRankVideos(
  conceptTitle: string,
  conceptSummary: string,
  subjectName: string,
  maxRankCount = 3,
  conceptId?: string,
  chapterTitle?: string,
) {
  logger.info('Starting search and rank videos for concept', { conceptTitle, subjectName, chapterTitle });

  // Try pgvector first if conceptId is provided
  if (conceptId) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const conceptText = `${conceptTitle}. ${conceptSummary}`.slice(0, 1000);
        const queryEmbedding = await getEmbedding(conceptText);

        const { data: existing } = await supabase.rpc('pgvector_search', {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: maxRankCount,
          input_concept_id: conceptId,
        });

        if (existing && existing.length > 0) {
          logger.info('Video ranking returned from pgvector', { conceptTitle, count: existing.length });
          return existing;
        }
      }
    } catch (err) {
      logger.warn('pgvector search unavailable, falling back to real-time search', { conceptTitle, err });
    }
  }

  // Multi-source educational video search + local embedding ranking.
  // Cap to 2 queries per concept to stay well within the YouTube Data API
  // daily quota, and stop early once we have a healthy pool to rank.
  const queries = (await generateSearchQueries(conceptTitle, subjectName, chapterTitle)).slice(0, 2);

  const videoMap = new Map<string, any>();

  const runQueries = async (queryList: string[]) => {
    for (const query of queryList) {
      if (videoMap.size >= maxRankCount * 3) break;
      try {
        const results = await searchEducationalVideos(query, 5);
        for (const video of results) {
          const key = video.videoId || video.id;
          if (!videoMap.has(key)) {
            videoMap.set(key, video);
          }
        }
      } catch (err: any) {
        logger.error('Error fetching videos during search and rank', { query, err: err.message });
      }
    }
  };

  await runQueries(queries);
  // Empty pool retry: primary queries can come back with nothing when scraping
  // is blocked or quota is exhausted — try deterministic queries before
  // giving up so concepts don't end up with zero videos.
  if (videoMap.size === 0) {
    logger.warn('Primary video queries returned empty pool, retrying with fallbacks', { conceptTitle });
    await runQueries(fallbackQueries(conceptTitle, subjectName, chapterTitle));
  }

  const uniqueVideos = Array.from(videoMap.values());
  if (uniqueVideos.length === 0) {
    return [];
  }

  try {
    const conceptText = `${conceptTitle}. ${chapterTitle ? `${chapterTitle}. ` : ''}${conceptSummary}`.slice(0, 1000);
    const conceptVector = await getEmbedding(conceptText);
    // Real topic keywords — used to stop unrelated videos from ranking just
    // because a single generic word (e.g. "lesson") appears in both titles.
    const conceptKeywords = tokenize(conceptTitle).filter((kw) => kw.length >= 3);

    const scoredVideos = await Promise.all(
      uniqueVideos.map(async (video: any) => {
        try {
          const titleText = String(video.title || '');
          const descText = String(video.description || '');
          const videoText = `${titleText}. ${descText}`.slice(0, 1000);
          const videoVector = await getEmbedding(videoText);
          const semantic = cosineSimilarity(conceptVector, videoVector);

          // Keyword overlap boost: videos whose title actually names the topic
          // get a head start over videos that merely resemble the concept text.
          const titleHits = countKeywordHits(titleText, conceptKeywords);
          const descHits = countKeywordHits(descText, conceptKeywords);
          const keywordBoost =
            Math.min(titleHits, 3) * TITLE_KEYWORD_BOOST +
            Math.min(descHits, 3) * DESC_KEYWORD_BOOST;
          const score = semantic + keywordBoost;

          return {
            ...video,
            score,
            semantic,
            keywordHits: titleHits + descHits,
            titleKeywordHits: titleHits,
            embedding: videoVector,
            source: video.source || 'youtube',
            sourceLabel: video.sourceLabel || 'YouTube',
          };
        } catch (err) {
          // Embedding failed for this video — fall back to lexical relevance so
          // a transient model error doesn't silently drop a clearly on-topic
          // video (title keyword hits still keep it in the ranking).
          logger.error('Error generating embedding for video comparison', { title: video.title, err });
          const titleHits = countKeywordHits(String(video.title || ''), conceptKeywords);
          return {
            ...video,
            score: titleHits > 0 ? titleHits * TITLE_KEYWORD_BOOST : 0.1,
            semantic: 0.1,
            keywordHits: titleHits,
            titleKeywordHits: titleHits,
            embedding: [],
            source: video.source || 'youtube',
            sourceLabel: video.sourceLabel || 'YouTube',
          };
        }
      })
    );

    // Relevance gate — drop videos that are neither semantically close nor
    // share real topic keywords. A SINGLE keyword hit only survives when the
    // video is at least loosely on topic semantically; otherwise one shared
    // generic word ("plant", "cell", "force") would pull in unrelated videos.
    const relevant = scoredVideos.filter((v: any) => {
      if ((v.semantic ?? 0) >= MIN_SEMANTIC_SCORE) return true;
      if ((v.titleKeywordHits ?? 0) >= 2) return true;
      return (v.titleKeywordHits ?? 0) >= 1 && (v.semantic ?? 0) >= MIN_SINGLE_KEYWORD_SEMANTIC;
    });

    // Ranking policy: Khan Academy is the first choice, but only when it
    // actually has a RELEVANT video — otherwise rank the remaining sources
    // (mostly YouTube) purely by relevance score.
    const byScoreDesc = (a: any, b: any) =>
      ((b.score ?? 0) + (b.source === 'khan_academy' ? KHAN_BONUS : 0)) -
      ((a.score ?? 0) + (a.source === 'khan_academy' ? KHAN_BONUS : 0));
    const khanRelevant = relevant.filter((v: any) => v.source === 'khan_academy').sort(byScoreDesc);
    const othersRelevant = relevant.filter((v: any) => v.source !== 'khan_academy').sort(byScoreDesc);
    const ordered = khanRelevant.length > 0
      ? [...khanRelevant, ...othersRelevant]
      : othersRelevant;

    logger.info('Video ranking complete', {
      conceptTitle,
      totalScored: scoredVideos.length,
      keptAfterRelevance: relevant.length,
      khanKept: khanRelevant.length,
      topScore: ordered[0]?.score,
    });

    return ordered.slice(0, maxRankCount);
  } catch (err) {
    logger.error('Failed to calculate vector similarity for videos, returning default ranked list', { err });
    return uniqueVideos.slice(0, maxRankCount).map((v: any) => ({ ...v, score: 0.5, embedding: [], source: v.source || 'youtube', sourceLabel: v.sourceLabel || 'YouTube' }));
  }
}
