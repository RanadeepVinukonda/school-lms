import { describe, it, expect } from 'vitest';

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('aiService model selection', () => {
  const ORIG_ENV = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  it('returns free model when no env vars set', async () => {
    const { getModel } = await import('@/services/aiService');
    const model = getModel('extract');
    expect(model).toBeTruthy();
    expect(typeof model).toBe('string');
  });

  it('reads extract model from env', async () => {
    import.meta.env.VITE_OPENROUTER_MODEL_EXTRACT = 'test-model-extract';
    const { getModel } = await import('@/services/aiService');
    expect(getModel('extract')).toBe('test-model-extract');
  });

  it('reads content model from env', async () => {
    import.meta.env.VITE_OPENROUTER_MODEL_CONTENT = 'test-model-content';
    const { getModel } = await import('@/services/aiService');
    expect(getModel('content')).toBe('test-model-content');
  });

  it('reads question model from env', async () => {
    import.meta.env.VITE_OPENROUTER_MODEL_QUESTION = 'test-model-questions';
    const { getModel } = await import('@/services/aiService');
    expect(getModel('question')).toBe('test-model-questions');
  });

});
