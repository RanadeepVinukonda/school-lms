import { collections } from '../database/adapter';
import { logger } from '../utils/logger';

export async function cleanupExpiredData() {
  logger.info('Cleaning up expired data...');

  const now = new Date().toISOString();

  try {
    const expiredTokensSnapshot = await collections.tokens()
      .where('expiresAt', '<', now)
      .where('used', '==', false)
      .get();

    if (!expiredTokensSnapshot.empty) {
      const batch = collections.tokens().firestore.batch();
      expiredTokensSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      logger.info(`Cleaned up ${expiredTokensSnapshot.docs.length} expired tokens`);
    }

    const oldNotificationsSnapshot = await collections.notifications()
      .where('createdAt', '<', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .get();

    if (!oldNotificationsSnapshot.empty) {
      const batch = collections.notifications().firestore.batch();
      oldNotificationsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      logger.info(`Cleaned up ${oldNotificationsSnapshot.docs.length} old notifications`);
    }

    const inProgressAttemptsSnapshot = await collections.quizAttempts()
      .where('status', '==', 'in_progress')
      .where('startedAt', '<', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .get();

    if (!inProgressAttemptsSnapshot.empty) {
      const batch = collections.quizAttempts().firestore.batch();
      inProgressAttemptsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'abandoned' });
      });
      await batch.commit();
      logger.info(`Marked ${inProgressAttemptsSnapshot.docs.length} abandoned quiz attempts`);
    }

    const inProgressExamAttemptsSnapshot = await collections.examAttempts()
      .where('status', '==', 'in_progress')
      .where('startedAt', '<', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .get();

    if (!inProgressExamAttemptsSnapshot.empty) {
      const batch = collections.examAttempts().firestore.batch();
      inProgressExamAttemptsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'abandoned' });
      });
      await batch.commit();
      logger.info(`Marked ${inProgressExamAttemptsSnapshot.docs.length} abandoned exam attempts`);
    }
  } catch (error) {
    logger.error('Failed to cleanup expired data', error);
  }
}
