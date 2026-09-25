import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

const FROM_EMAIL = env.RESEND_FROM_EMAIL || 'School LMS <noreply@school-lms.com>';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const resend = getClient();
  if (!resend) {
    logger.warn('RESEND_API_KEY not set — skipping password reset email', { to });
    return;
  }

  const subject = 'Reset your School LMS password';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:#4f46e5;padding:24px 28px;">
                    <h1 style="color:#ffffff;font-size:20px;margin:0;">Reset your password</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                      We received a request to reset the password for your School LMS account.
                    </p>
                    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Click the button below to choose a new password. This link is valid for
                      <strong>60 minutes</strong> and can only be used once.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:8px;">
                          <a href="${resetUrl}" target="_blank" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">
                            Reset password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:24px 0 0;">
                      If you did not request this, you can safely ignore this email — your password
                      will not change.
                    </p>
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
                    <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
                      School LMS &middot; For security, this link expires in 60 minutes.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    if (error) {
      logger.error('Failed to send password reset email', { to, error });
    } else {
      logger.info('Password reset email sent', { to });
    }
  } catch (err: any) {
    logger.error('Password reset email threw', { to, error: err.message });
  }
}