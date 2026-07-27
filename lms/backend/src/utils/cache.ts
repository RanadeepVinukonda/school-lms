import { logger } from './logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private readonly name: string;

  constructor(name: string, options?: { defaultTtlMs?: number; maxSize?: number }) {
    this.name = name;
    this.defaultTtlMs = options?.defaultTtlMs ?? 60_000;
    this.maxSize = options?.maxSize ?? 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    // Move to end for LRU: delete and re-set preserves insertion order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
    this.stats.sets++;
  }

  getOrSet<T>(key: string, factory: () => T | Promise<T>, ttlMs?: number): T | Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const result = factory();
    if (result instanceof Promise) {
      return result.then((v) => {
        this.set(key, v, ttlMs);
        return v;
      });
    }
    this.set(key, result, ttlMs);
    return result;
  }

  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  getStats(): CacheStats & { size: number; name: string } {
    return { ...this.stats, size: this.store.size, name: this.name };
  }

  private evictOldest(): void {
    const oldestKey = this.store.keys().next().value;
    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

export const userCache = new MemoryCache('users', { defaultTtlMs: 300_000, maxSize: 500 });
export const classCache = new MemoryCache('classes', { defaultTtlMs: 300_000, maxSize: 200 });
export const feeCache = new MemoryCache('fees', { defaultTtlMs: 120_000, maxSize: 200 });
export const quizCache = new MemoryCache('quizzes', { defaultTtlMs: 60_000, maxSize: 500 });
export const settingsCache = new MemoryCache('settings', { defaultTtlMs: 600_000, maxSize: 50 });

export function logCacheStats(): void {
  for (const cache of [userCache, classCache, feeCache, quizCache, settingsCache]) {
    const stats = cache.getStats();
    if (stats.hits + stats.misses > 0) {
      const hitRate = ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1);
      logger.debug(`Cache ${stats.name}: ${hitRate}% hit rate (${stats.hits} hits, ${stats.misses} misses, ${stats.size} entries)`);
    }
  }
}
