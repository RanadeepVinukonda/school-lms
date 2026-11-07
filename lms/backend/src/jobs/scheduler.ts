import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { checkUpcomingDeadlines } from './sendReminders.job';
import { cleanupExpiredData, cleanupSoftDeletedRecords } from './cleanupExpired.job';
import { generateWeeklyReport, generateMonthlyReport } from './generateReports.job';
import { cleanupIdempotencyKeys } from './cleanup-idempotency.job';
import { retryPendingPdfCleanups } from '../services/textbook-cleanup.service';
import { getSupabaseAdmin } from '../services/supabase';
import { TransactionManager } from '../database/transaction-manager';
import { getConnectionPool } from '../database/connection-manager';

const timers: Map<string, ReturnType<typeof setInterval>> = new Map();
const SCHEDULER_LEASE_SECONDS = 90;
const SCHEDULER_HEARTBEAT_MS = 30_000;
const SCHEDULER_INSTANCE_ID = randomUUID();
let schedulerIsLeader = false;
let schedulerHeartbeat: ReturnType<typeof setInterval> | null = null;

async function renewSchedulerLease(): Promise<boolean> {
  const result = await getConnectionPool().query<{ instance_id: string }>(
    `INSERT INTO scheduler_leader (id, instance_id, expires_at, updated_at)
     VALUES (1, $1, NOW() + INTERVAL '${SCHEDULER_LEASE_SECONDS} seconds', NOW())
     ON CONFLICT (id) DO UPDATE
       SET instance_id = EXCLUDED.instance_id,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()
       WHERE scheduler_leader.expires_at < NOW()
          OR scheduler_leader.instance_id = EXCLUDED.instance_id
     RETURNING instance_id`,
    [SCHEDULER_INSTANCE_ID],
  );

  return result.rows[0]?.instance_id === SCHEDULER_INSTANCE_ID;
}

function startTimers(): void {
  if (timers.size > 0) return;

  logger.info('Starting job scheduler (setInterval-based, 8 timers)...');

  timers.set('sendReminders', setInterval(() => {
    checkUpcomingDeadlines().catch(err => logger.error('sendReminders failed', err));
  }, 30 * 60 * 1000));

  timers.set('cleanupExpired', setInterval(() => {
    cleanupExpiredData().catch(err => logger.error('cleanupExpired failed', err));
  }, 60 * 60 * 1000));

  timers.set('overdueTests', setInterval(() => {
    checkOverdueTests().catch(err => logger.error('overdueTests failed', err));
  }, 5 * 60 * 1000));

  setTimeout(() => {
    checkOverdueTests().catch(err => logger.error('Initial overdue check failed', err));
  }, 15_000);

  timers.set('weeklyReport', setInterval(() => {
    const now = new Date();
    if (now.getDay() === 1 && now.getHours() === 6) {
      generateWeeklyReport().catch(err => logger.error('weeklyReport failed', err));
    }
  }, 60 * 60 * 1000));

  timers.set('monthlyReport', setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getHours() === 6) {
      generateMonthlyReport().catch(err => logger.error('monthlyReport failed', err));
    }
  }, 60 * 60 * 1000));

  timers.set('softDeleteCleanup', setInterval(() => {
    cleanupSoftDeletedRecords().catch(err => logger.error('softDeleteCleanup failed', err));
  }, 6 * 60 * 60 * 1000));

  timers.set('idempotencyCleanup', setInterval(() => {
    cleanupIdempotencyKeys().catch(err => logger.error('idempotencyCleanup failed', err));
  }, 6 * 60 * 60 * 1000));

  timers.set('pdfCleanupRetry', setInterval(() => {
    retryPendingPdfCleanups().catch(err => logger.error('pdfCleanupRetry failed', err));
  }, 60 * 60 * 1000));

  logger.info('Scheduler started with 8 setInterval timers');
}

function stopTimers(): void {
  for (const [name, timer] of timers.entries()) {
    clearInterval(timer);
    logger.info(`Timer ${name} stopped`);
  }
  timers.clear();
}

export async function checkOverdueTests(): Promise<void> {
  logger.info('Checking overdue tests...');

  try {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin()!;

    const { data: tests } = await supabase
      .from('firestore_docs')
      .select('doc_id, data')
      .eq('collection', 'examV2')
      .filter('data->>endDate', 'lt', now);

    if (!tests || tests.length === 0) return;

    for (const testRow of tests) {
      const testData = testRow.data as Record<string, unknown>;
      const classId = testData.classId as string | undefined;
      const testTitle = (testData.title as string) || 'Test';
      const testId = testRow.doc_id;

      if (!classId) continue;

      try {
        const { data: students } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'student')
          .contains('class_ids', [classId]);

        if (!students || students.length === 0) continue;

        const { data: attempts } = await supabase
          .from('firestore_docs')
          .select('data')
          .eq('collection', 'examAttemptV2')
          .contains('data', { examId: testId });

        const submittedStudentIds = new Set(
          (attempts || []).map((a) => (a.data as Record<string, unknown>).studentId as string),
        );

        const notSubmitted = students.filter((s) => !submittedStudentIds.has(s.id));
        if (notSubmitted.length === 0) continue;

        const entries: Array<{ id: string; data: Record<string, unknown> }> = [];

        for (const student of notSubmitted) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', student.id)
            .eq('type', 'test_overdue')
            .contains('data', { testId })
            .limit(1);

          if (existing && existing.length > 0) continue;

          entries.push({
            id: randomUUID(),
            data: {
              recipientId: student.id,
              type: 'test_overdue',
              title: 'Test Overdue',
              body: `You have not submitted "${testTitle}". Please submit as soon as possible.`,
              metadata: { testId, testTitle },
              isRead: false,
              createdAt: new Date().toISOString(),
            },
          });
        }

        if (entries.length > 0) {
          const tm = new TransactionManager();
          await tm.runTransaction(async (tx) => {
            for (const e of entries) {
              tx.set('notifications', e.id, e.data);
            }
          });
          logger.info('Overdue notifications sent', { testId, count: entries.length });
        }
      } catch (err) {
        logger.error('Failed to process overdue test', { testId, err });
      }
    }
  } catch (error) {
    logger.error('Overdue test check failed', error as Record<string, unknown>);
  }
}

async function refreshSchedulerLeadership(): Promise<void> {
  try {
    const isLeader = await renewSchedulerLease();

    if (isLeader && !schedulerIsLeader) {
      schedulerIsLeader = true;
      logger.info('Scheduler leadership acquired');
      startTimers();
    } else if (!isLeader && schedulerIsLeader) {
      schedulerIsLeader = false;
      logger.warn('Scheduler leadership lost; stopping timers');
      stopTimers();
    }
  } catch (error) {
    logger.error('Scheduler leadership check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function startScheduler(): Promise<void> {
  if (process.env.SCHEDULER_ENABLED === 'false') {
    logger.info('Scheduler disabled via SCHEDULER_ENABLED=false');
    return;
  }

  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL not set; scheduler runs without a leader lease');
    startTimers();
    return;
  }

  try {
    await getConnectionPool().query(
      `CREATE TABLE IF NOT EXISTS scheduler_leader (
         id INTEGER PRIMARY KEY,
         instance_id TEXT NOT NULL,
         expires_at TIMESTAMPTZ NOT NULL,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`,
    );
  } catch (error) {
    logger.error('Scheduler leader table unavailable; running without a lease', {
      error: error instanceof Error ? error.message : String(error),
    });
    startTimers();
    return;
  }

  await refreshSchedulerLeadership();
  schedulerHeartbeat = setInterval(refreshSchedulerLeadership, SCHEDULER_HEARTBEAT_MS);
}

export async function stopScheduler(): Promise<void> {
  if (schedulerHeartbeat) {
    clearInterval(schedulerHeartbeat);
    schedulerHeartbeat = null;
  }

  stopTimers();

  if (schedulerIsLeader && process.env.DATABASE_URL) {
    schedulerIsLeader = false;
    await getConnectionPool()
      .query('UPDATE scheduler_leader SET expires_at = NOW() WHERE id = 1 AND instance_id = $1', [
        SCHEDULER_INSTANCE_ID,
      ])
      .catch(() => undefined);
  }
}
