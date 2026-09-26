import crypto from 'crypto';
import { getConnectionPool } from '../database/connection-manager';
import { updateUser } from '../database/auth';
import { sendPasswordResetEmail } from './email.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError, ErrorCode } from '../utils/errors';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicResetUrl(token: string): string {
  const base = (env.APP_URL || env.FRONTEND_URL || '').replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export const passwordResetService = {
  async requestPasswordReset(email: string): Promise<void> {
    const pool = getConnectionPool();
    const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    const user = rows[0] as { id: string } | undefined;

    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, hashToken(token), expiresAt]
      );

      try {
        await sendPasswordResetEmail(email, publicResetUrl(token));
      } catch (err: any) {
        logger.error('Password reset email failed', { error: err.message });
        throw err;
      }
    }

    // Always return success to avoid user enumeration.
  },

  async verifyResetToken(token: string): Promise<{ uid: string }> {
    const pool = getConnectionPool();
    const { rows } = await pool.query(
      `SELECT user_id, expires_at
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL
       LIMIT 1`,
      [hashToken(token)]
    );
    const row = rows[0] as { user_id: string; expires_at: string | Date } | undefined;
    if (!row) {
      throw new AppError(400, 'Invalid or already-used reset link', undefined, ErrorCode.BAD_REQUEST);
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new AppError(400, 'This reset link has expired', undefined, ErrorCode.BAD_REQUEST);
    }
    return { uid: row.user_id };
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const { uid } = await this.verifyResetToken(token);

    await updateUser(uid, { password: newPassword });

    const pool = getConnectionPool();
    await pool.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE token_hash = $1`,
      [hashToken(token)]
    );
  },
};