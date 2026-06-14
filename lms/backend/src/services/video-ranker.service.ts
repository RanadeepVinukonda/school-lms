import { searchVideos } from './youtube.service';
import { getEmbedding, cosineSimilarity } from './transformers.service';
import { logger } from '../utils/logger';
import { chatCompletion } from './ai.service';

/**
 * Generate 3-4 natural search queries for a concept using AI.
 * Falls back to basic variations of the concept title if AI is unavailable.
 */
async function generateSearchQueries(conceptTitle: string, subjectName: string): Promise<string[]> {
  try {
    const rawResponse = await chatCompletion({
      model: 'gemini-2.0-flash',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant. Output 4 distinct, highly relevant YouTube search queries for a student trying to learn the concept. Output ONLY as a raw JSON string array, like: ["query 1", "query 2"]',
        },
        {
          role: 'user',
          content: `Concept: "${conceptTitle}" under subject "${subjectName}"`,
        },
      ],
      temperature: 0.3,
    });

    const parsed = JSON.parse(rawResponse.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(String);
    }
  } catch (err) {
    logger.warn('Failed to generate search queries using LLM, using fallbacks', { conceptTitle, err });
  }

  // Fallbacks
  return [
    `${conceptTitle} ${subjectName} tutorial`,
    `${conceptTitle} explained`,
    `${conceptTitle} examples lesson`,
    `${conceptTitle} for beginners`,
  ];
}

/**
 * Search and rank YouTube videos for a concept using local embeddings.
 */
export async function searchAndRankVideos(
  conceptTitle: string,
  conceptSummary: string,
  subjectName: string,
  maxRankCount = 3
) {
  logger.info('Starting search and rank videos for concept', { conceptTitle, subjectName });
  const queries = await generateSearchQueries(conceptTitle, subjectName);
  
  const videoMap = new Map<string, any>();

  // Fetch from YouTube for each query (deduplicating by videoId)
  for (const query of queries) {
    try {
      const results = await searchVideos(query, 5);
      for (const video of results) {
        if (!videoMap.has(video.youtubeId)) {
          videoMap.set(video.youtubeId, video);
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
    // Generate embedding for the concept context
    const conceptText = `${conceptTitle}. ${conceptSummary}`.slice(0, 1000);
    const conceptVector = await getEmbedding(conceptText);

    const scoredVideos = await Promise.all(
      uniqueVideos.map(async (video) => {
        try {
          const videoText = `${video.title}. ${video.description}`.slice(0, 1000);
          const videoVector = await getEmbedding(videoText);
          const score = cosineSimilarity(conceptVector, videoVector);
          
          return {
            ...video,
            score,
            embedding: videoVector,
          };
        } catch (err) {
          logger.error('Error generating embedding for video comparison', { title: video.title, err });
          return {
            ...video,
            score: 0.1, // low default score
            embedding: [],
          };
        }
      })
    );

    // Sort descending by score
    scoredVideos.sort((a, b) => b.score - a.score);

    logger.info('Video ranking complete', {
      conceptTitle,
      totalScored: scoredVideos.length,
      topScore: scoredVideos[0]?.score,
    });

    return scoredVideos.slice(0, maxRankCount);
  } catch (err) {
    logger.error('Failed to calculate vector similarity for videos, returning default ranked list', { err });
    return uniqueVideos.slice(0, maxRankCount).map(v => ({ ...v, score: 0.5, embedding: [] }));
  }
}
