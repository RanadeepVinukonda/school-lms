import { getEmbedding, cosineSimilarity } from './transformers.service';
import { logger } from '../utils/logger';

export interface EducationalResource {
  title: string;
  url: string;
  source: 'Khan Academy' | 'NPTEL' | 'MIT OpenCourseWare' | 'FreeCodeCamp' | 'TED-Ed' | 'GeeksforGeeks';
  description: string;
  category: string;
}

// Pre-seeded high-quality educational resources across typical subjects
const CURATED_RESOURCES: EducationalResource[] = [
  // Math & Science
  {
    title: 'Algebra Foundations - Khan Academy',
    url: 'https://www.khanacademy.org/math/algebra',
    source: 'Khan Academy',
    description: 'Learn the basics of algebra, variables, linear equations, functions, and graphing.',
    category: 'Mathematics',
  },
  {
    title: 'Calculus 1 - MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/',
    source: 'MIT OpenCourseWare',
    description: 'Complete course covering derivatives, integration, limits, and applications of calculus.',
    category: 'Mathematics',
  },
  {
    title: 'Introduction to Chemistry - Khan Academy',
    url: 'https://www.khanacademy.org/science/chemistry',
    source: 'Khan Academy',
    description: 'Explores atoms, elements, molecules, chemical reactions, stoichiometry, and kinetics.',
    category: 'Science',
  },
  {
    title: 'Classical Mechanics & Physics - MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/8-01sc-physics-i-classical-mechanics-fall-2016/',
    source: 'MIT OpenCourseWare',
    description: 'Learn Newtonian mechanics, energy, momentum, gravity, and rotational dynamics.',
    category: 'Science',
  },
  {
    title: 'Thermodynamics Lectures - NPTEL',
    url: 'https://nptel.ac.in/courses/112105123',
    source: 'NPTEL',
    description: 'Academic lectures on cycles, state equations, entropy, and laws of thermodynamics.',
    category: 'Science',
  },
  // Computer Science & Coding
  {
    title: 'Data Structures and Algorithms - GeeksforGeeks',
    url: 'https://www.geeksforgeeks.org/data-structures/',
    source: 'GeeksforGeeks',
    description: 'Comprehensive guide to arrays, trees, heaps, graphs, hashing, sorting, and dynamic programming.',
    category: 'Computer Science',
  },
  {
    title: 'Python for Beginners - FreeCodeCamp',
    url: 'https://www.freecodecamp.org/news/python-for-beginners-course/',
    source: 'FreeCodeCamp',
    description: 'Full course covering variables, loops, object-oriented coding, and basic script construction.',
    category: 'Computer Science',
  },
  {
    title: 'JavaScript Data Structures - FreeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    source: 'FreeCodeCamp',
    description: 'Master JavaScript basics, ES6 standards, regular expressions, and basic algorithm script writing.',
    category: 'Computer Science',
  },
  {
    title: 'Operating Systems Course - NPTEL',
    url: 'https://nptel.ac.in/courses/106108101',
    source: 'NPTEL',
    description: 'Lectures on scheduling, virtualization, file systems, synchronization, and memory management.',
    category: 'Computer Science',
  },
  // TED-Ed general topics
  {
    title: 'How does the brain form memories? - TED-Ed',
    url: 'https://ed.ted.com/lessons/how-memories-form-and-how-we-lose-them',
    source: 'TED-Ed',
    description: 'An educational breakdown of neuroscience, sensory pathways, synapses, and recall.',
    category: 'General Science',
  },
];

// In-memory cache for resource embeddings to avoid recalculating them repeatedly
const resourceEmbeddingCache = new Map<string, number[]>();

async function getResourceEmbedding(resource: EducationalResource): Promise<number[]> {
  const cacheKey = `${resource.source}::${resource.title}`;
  if (resourceEmbeddingCache.has(cacheKey)) {
    return resourceEmbeddingCache.get(cacheKey)!;
  }
  const textToEmbed = `${resource.title}. ${resource.description} ${resource.category}`;
  const vec = await getEmbedding(textToEmbed);
  resourceEmbeddingCache.set(cacheKey, vec);
  return vec;
}

/**
 * Score static curated resources against a concept description using vector similarity.
 */
export async function matchAndRankResources(
  conceptTitle: string,
  conceptSummary: string,
  maxResults = 3
) {
  logger.info('Matching static educational resources', { conceptTitle });

  try {
    const conceptText = `${conceptTitle}. ${conceptSummary}`.slice(0, 1000);
    const conceptVector = await getEmbedding(conceptText);

    const scoredResources = await Promise.all(
      CURATED_RESOURCES.map(async (resource) => {
        try {
          const resourceVector = await getResourceEmbedding(resource);
          const score = cosineSimilarity(conceptVector, resourceVector);
          return {
            ...resource,
            score,
            embedding: resourceVector,
          };
        } catch (err) {
          logger.error('Error generating embedding for resource comparison', { resource: resource.title, err });
          return {
            ...resource,
            score: 0.0,
            embedding: [],
          };
        }
      })
    );

    // Sort descending by similarity score
    scoredResources.sort((a, b) => b.score - a.score);

    logger.info('Resource ranking complete', {
      conceptTitle,
      topResource: scoredResources[0]?.title,
      topScore: scoredResources[0]?.score,
    });

    return scoredResources.slice(0, maxResults);
  } catch (err) {
    logger.error('Failed to align educational resources using vector embeddings, returning fallbacks', { err });
    // Fallback to top 3 general resources
    return CURATED_RESOURCES.slice(0, maxResults).map(r => ({ ...r, score: 0.5, embedding: [] }));
  }
}
