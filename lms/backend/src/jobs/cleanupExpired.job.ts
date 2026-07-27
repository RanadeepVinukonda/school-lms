import { getSupabaseAdmin } from '../services/supabase';
import { logger } from '../utils/logger';
import { TransactionManager } from '../database/transaction-manager';

const SOFT_DELETE_TABLES = [
  'subjects', 'courses', 'lessons', 'assignments', 'quizzes', 'exams', 'classes',
  'notice_board', 'staff_records', 'suppliers', 'inventory_categories', 'inventory_items',
  'transport_routes', 'transport_stops', 'transport_assignments', 'curriculum_plans',
  'device_tokens', 'timetable', 'users',
];

export async function cleanupSoftDeletedRecords() {
  const supabase = getSupabaseAdmin()!;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const table of SOFT_DELETE_TABLES) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .lt('deleted_at', cutoff);

      if (error) {
        logger.error(`Failed to purge soft-deleted records from ${table}`, { error: error.message });
        continue;
      }

    } catch (err) {
      logger.error(`Failed to purge soft-deleted records from ${table}`, { error: err });
    }
  }
}

export async function cleanupExpiredData() {
  logger.info('Cleaning up expired data...');

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin()!;

  try {
    const { data: expiredTokens } = await supabase
      .from('firestore_docs')
      .select('doc_id')
      .eq('collection', 'tokens')
      .filter('data->>expiresAt', 'lt', now)
      .contains('data', { used: false });

    if (expiredTokens && expiredTokens.length > 0) {
      const tm = new TransactionManager();
      await tm.runTransaction(async (tx) => {
        for (const doc of expiredTokens) {
          tx.delete('tokens', doc.doc_id);
        }
      });
      logger.info(`Cleaned up ${expiredTokens.length} expired tokens`);
    }

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldNotifications } = await supabase
      .from('notifications')
      .select('id')
      .lt('created_at', cutoff);

    if (oldNotifications && oldNotifications.length > 0) {
      const tm = new TransactionManager();
      await tm.runTransaction(async (tx) => {
        for (const doc of oldNotifications) {
          tx.delete('notifications', doc.id);
        }
      });
      logger.info(`Cleaned up ${oldNotifications.length} old notifications`);
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: inProgressAttempts } = await supabase
      .from('firestore_docs')
      .select('doc_id')
      .eq('collection', 'quizAttempts')
      .contains('data', { status: 'in_progress' })
      .filter('data->>startedAt', 'lt', oneDayAgo);

    if (inProgressAttempts && inProgressAttempts.length > 0) {
      const tm = new TransactionManager();
      await tm.runTransaction(async (tx) => {
        for (const doc of inProgressAttempts) {
          tx.update('quizAttempts', doc.doc_id, { status: 'abandoned' });
        }
      });
      logger.info(`Marked ${inProgressAttempts.length} abandoned quiz attempts`);
    }

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: inProgressExamAttempts } = await supabase
      .from('firestore_docs')
      .select('doc_id')
      .eq('collection', 'examAttempts')
      .contains('data', { status: 'in_progress' })
      .filter('data->>startedAt', 'lt', twoDaysAgo);

    if (inProgressExamAttempts && inProgressExamAttempts.length > 0) {
      const tm = new TransactionManager();
      await tm.runTransaction(async (tx) => {
        for (const doc of inProgressExamAttempts) {
          tx.update('examAttempts', doc.doc_id, { status: 'abandoned' });
        }
      });
      logger.info(`Marked ${inProgressExamAttempts.length} abandoned exam attempts`);
    }
  } catch (error) {
    logger.error('Failed to cleanup expired data', error as Record<string, unknown>);
  }
}
