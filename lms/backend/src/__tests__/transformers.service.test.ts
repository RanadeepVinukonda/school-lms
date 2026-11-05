import { getEmbedding, cosineSimilarity } from '../services/transformers.service';

describe('Transformers Service', () => {
  // Set longer timeout because downloading model on first test run takes a bit of time
  jest.setTimeout(60000);

  it('should generate a 384-dimensional vector embedding for text', async () => {
    const text = 'Hello world, this is a test of local transformers embeddings';
    const embedding = await getEmbedding(text);
    
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(384);
    expect(typeof embedding[0]).toBe('number');
  });

  it('should calculate identical cosine similarity for same vectors', () => {
    const vecA = [1.0, 0.0, -1.0, 0.5];
    const similarity = cosineSimilarity(vecA, vecA);
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it('should calculate expected similarity scores for known opposite vectors', () => {
    const vecA = [1.0, 0.0, 0.0];
    const vecB = [-1.0, 0.0, 0.0];
    const similarity = cosineSimilarity(vecA, vecB);
    expect(similarity).toBeCloseTo(-1.0, 5);
  });

  it('should score positive similarity for related words', async () => {
    const vecAlgebra = await getEmbedding('algebraic equations and variables');
    const vecCalculus = await getEmbedding('integrals and derivatives calculus');
    const vecFruit = await getEmbedding('apples oranges fresh fruit market');

    const mathSimilarity = cosineSimilarity(vecAlgebra, vecCalculus);
    const mathFruitSimilarity = cosineSimilarity(vecAlgebra, vecFruit);

    expect(mathSimilarity).toBeGreaterThan(mathFruitSimilarity);
  });
});
