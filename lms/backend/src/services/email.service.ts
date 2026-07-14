import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Returns true if SMTP is configured. */
export function isSmtpConfigured() {
  return !!(env.SMTP_USER && env.SMTP_PASS);
}

/** Send a password reset email via SMTP. Throws if SMTP not configured. */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const t = getTransporter();
  if (!t) {
    throw new Error('SMTP not configured');
  }

  const subject = 'Reset your School LMS password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Password Reset</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Click the button below to reset your password. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background-color: #2563eb; color: #fff; text-decoration: none;
                padding: 12px 24px; border-radius: 6px; font-size: 14px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  const info = await t.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject,
    html,
    text: `Reset your password: ${resetUrl}`,
  });

  logger.info('Password reset email sent', { email, messageId: info.messageId });
}