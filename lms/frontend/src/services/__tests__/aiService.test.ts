import { describe, it, expect } from 'vitest';

describe('aiService', () => {
  it('exports required functions', async () => {
    const mod = await import('@/services/aiService');
    expect(typeof mod.extractChapters).toBe('function');
    expect(typeof mod.generateConceptContentAndQuestions).toBe('function');
  });
});
