import { searchEducationalVideos } from './educational-video.service';
import { getEmbedding, cosineSimilarity } from './transformers.service';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';

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

  // Multi-source educational video search + local embedding ranking
  const queries = await generateSearchQueries(conceptTitle, subjectName);

  const videoMap = new Map<string, any>();

  for (const query of queries) {
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

    const scoredVideos = await Promise.all(
      uniqueVideos.map(async (video: any) => {
        try {
          const videoText = `${video.title}. ${video.description}`.slice(0, 1000);
          const videoVector = await getEmbedding(videoText);
          const score = cosineSimilarity(conceptVector, videoVector);

          return { ...video, score, embedding: videoVector, source: video.source || 'youtube', sourceLabel: video.sourceLabel || 'YouTube' };
        } catch (err) {
          logger.error('Error generating embedding for video comparison', { title: video.title, err });
          return { ...video, score: 0.1, embedding: [], source: video.source || 'youtube', sourceLabel: video.sourceLabel || 'YouTube' };
        }
      })
    );

    scoredVideos.sort((a, b) => b.score - a.score);

    logger.info('Video ranking complete', {
      conceptTitle,
      totalScored: scoredVideos.length,
      topScore: scoredVideos[0]?.score,
    });

    return scoredVideos.slice(0, maxRankCount);
  } catch (err) {
    logger.error('Failed to calculate vector similarity for videos, returning default ranked list', { err });
    return uniqueVideos.slice(0, maxRankCount).map((v: any) => ({ ...v, score: 0.5, embedding: [], source: v.source || 'youtube', sourceLabel: v.sourceLabel || 'YouTube' }));
  }
}
