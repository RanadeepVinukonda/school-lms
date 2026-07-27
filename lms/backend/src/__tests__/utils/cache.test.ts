import { MemoryCache } from '../../utils/cache';

describe('MemoryCache', () => {
  it('stores and retrieves values', () => {
    const cache = new MemoryCache('test', { defaultTtlMs: 60000, maxSize: 100 });
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns null for expired entries', () => {
    const cache = new MemoryCache('test', { defaultTtlMs: 1, maxSize: 100 });
    cache.set('key1', 'value1');
    return new Promise(resolve => setTimeout(() => {
      expect(cache.get('key1')).toBeNull();
      resolve(undefined);
    }, 10));
  });

  it('respects maxSize', () => {
    const cache = new MemoryCache('test', { defaultTtlMs: 60000, maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeNull();
    expect(cache.get('c')).toBe(3);
  });

  it('clear() removes all entries', () => {
    const cache = new MemoryCache('test', { defaultTtlMs: 60000, maxSize: 100 });
    cache.set('a', 1);
    cache.clear();
    expect(cache.get('a')).toBeNull();
  });
});
