import { describe, it, expect } from 'vitest';

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

  it('throws if no API key', async () => {
    const key = import.meta.env.VITE_OPENROUTER_API_KEY;
    delete import.meta.env.VITE_OPENROUTER_API_KEY;
    const { getOpenRouterApiKey } = await import('@/services/aiService');
    expect(() => getOpenRouterApiKey()).toThrow('OpenRouter API key');
    import.meta.env.VITE_OPENROUTER_API_KEY = key;
  });
});
