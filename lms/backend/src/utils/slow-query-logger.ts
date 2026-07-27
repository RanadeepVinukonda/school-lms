import { Counter } from 'prom-client';
import { logger } from './logger';

const SLOW_QUERY_THRESHOLD_MS = 500;

export const slowQueryCounter = new Counter({
  name: 'lms_slow_queries_total',
  help: 'Total number of slow queries (>500ms)',
  labelNames: ['table'] as const,
});

function extractTableName(sql: string): string {
  const match = sql.match(/(?:FROM|INTO|UPDATE|JOIN)\s+(\w+)/i);
  return match?.[1]?.toLowerCase() || 'unknown';
}

export function logSlowQuery(query: string, durationMs: number, params?: unknown[]): void {
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
    const table = extractTableName(query);
    logger.warn('Slow query detected', {
      query: query.substring(0, 200),
      durationMs,
      params: params?.slice(0, 5),
    });
    slowQueryCounter.labels({ table }).inc();
  }
}

export function createQueryTimer(): { end: (query: string, params?: unknown[]) => void } {
  const start = Date.now();
  return {
    end: (query: string, params?: unknown[]) => {
      const duration = Date.now() - start;
      logSlowQuery(query, duration, params);
    },
  };
}
