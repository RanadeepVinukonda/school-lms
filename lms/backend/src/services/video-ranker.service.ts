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
// Boost added per distinct concept keyword found in the video title. Applied
// on top of the semantic score so exact-topic videos outrank loose matches.
const TITLE_KEYWORD_BOOST = 0.09;
const DESC_KEYWORD_BOOST = 0.03;
// Only titles that share at least this many concept keywords are kept when the
// semantic score is below MIN_SEMANTIC_SCORE.
const MIN_KEYWORD_HITS_FALLBACK = 1;

async function generateSearchQueries(conceptTitle: string, subjectName: string): Promise<string[]> {
  try {
    const rawResponse = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant. Output 4 distinct, highly relevant educational video search queries for a student trying to learn the concept. Output ONLY as a raw JSON string array, like: ["query 1", "query 2"]',
        },
        {
          role: 'user',
          content: `Concept: "${conceptTitle}" under subject "${subjectName}"`,
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

export async function searchAndRankVideos(
  conceptTitle: string,
  conceptSummary: string,
  subjectName: string,
  maxRankCount = 3,
  conceptId?: string,
) {
  logger.info('Starting search and rank videos for concept', { conceptTitle, subjectName });

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
  const queries = (await generateSearchQueries(conceptTitle, subjectName)).slice(0, 2);

  const videoMap = new Map<string, any>();

  for (const query of queries) {
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

  const uniqueVideos = Array.from(videoMap.values());
  if (uniqueVideos.length === 0) {
    return [];
  }

  try {
    const conceptText = `${conceptTitle}. ${conceptSummary}`.slice(0, 1000);
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
    // share real topic keywords. This is the fix for "completely different
    // video came up because a word matched in the title".
    const relevant = scoredVideos.filter((v: any) => {
      if ((v.semantic ?? 0) >= MIN_SEMANTIC_SCORE) return true;
      return (v.titleKeywordHits ?? 0) >= MIN_KEYWORD_HITS_FALLBACK;
    });

    // Always prioritize Khan Academy content, then rank the rest by similarity.
    relevant.sort((a, b) => {
      const aKhan = a.source === 'khan_academy' ? 0 : 1;
      const bKhan = b.source === 'khan_academy' ? 0 : 1;
      return aKhan - bKhan || b.score - a.score;
    });

    logger.info('Video ranking complete', {
      conceptTitle,
      totalScored: scoredVideos.length,
      keptAfterRelevance: relevant.length,
      topScore: relevant[0]?.score,
    });

    return relevant.slice(0, maxRankCount);
  } catch (err) {
    logger.error('Failed to calculate vector similarity for videos, returning default ranked list', { err });
    return uniqueVideos.slice(0, maxRankCount).map((v: any) => ({ ...v, score: 0.5, embedding: [], source: v.source || 'youtube', sourceLabel: v.sourceLabel || 'YouTube' }));
  }
}
