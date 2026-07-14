import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as searchService from '../services/search.service';

describe('Search Service Client', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { textbooks: [], concepts: [], courses: [] } }),
      } as Response)
    ) as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call search microservice index endpoint', async () => {
    await searchService.indexDocument('textbooks', 'tb-1', { title: 'Algebra' });
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it('should query search endpoint', async () => {
    const res = await searchService.searchAll('algebra', 'school-1');
    expect(res).toBeDefined();
    expect(res.textbooks).toBeDefined();
  });
});
