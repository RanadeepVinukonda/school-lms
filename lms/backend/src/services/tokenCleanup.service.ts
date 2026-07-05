import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_TTL_DAYS = 7;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Delete revoked tokens older than TOKEN_TTL_DAYS days.
 * Tokens expire naturally after 7 days so old rows provide no security benefit.
 */
export async function cleanupRevokedTokens(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const cutoff = new Date(Date.now() - TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('revoked_tokens')
    .delete()
    .lt('created_at', cutoff);

  if (error) {
    logger.warn('Failed to cleanup revoked tokens', { error: error.message });
  } else {
    logger.info('Revoked token cleanup completed', { cutoff });
  }
}

/**
 * Start the periodic cleanup job. Runs immediately on call, then every 24 hours.
 * Call once during server startup.
 */
export function startTokenCleanup(): void {
  if (cleanupTimer) return; // already running

  // Run once immediately on startup
  cleanupRevokedTokens().catch((err) =>
    logger.warn('Initial revoked token cleanup failed', { error: err instanceof Error ? err.message : String(err) })
  );

  cleanupTimer = setInterval(() => {
    cleanupRevokedTokens().catch((err) =>
      logger.warn('Periodic revoked token cleanup failed', { error: err instanceof Error ? err.message : String(err) })
    );
  }, CLEANUP_INTERVAL_MS);

  logger.info('Token cleanup scheduler started', { intervalHours: 24 });
}

/**
 * Stop the periodic cleanup job (for graceful shutdown / test teardown).
 */
export function stopTokenCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('Token cleanup scheduler stopped');
  }
}
