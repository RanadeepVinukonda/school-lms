import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../services/supabase';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.substring(0, idx).trim();
      const val = part.substring(idx + 1).trim();
      if (key) cookies[key] = val;
    }
  }
  return cookies;
}

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  sendCreated(res, result, 'Registration successful');
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  const maxAge = 7 * 24 * 60 * 60 * 1000;
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  sendSuccess(res, result, 'Login successful');
}

export async function getProfile(req: Request, res: Response) {
  const result = await authService.getUserProfile(req.user!.uid);
  sendSuccess(res, result);
}

export async function updateProfile(req: Request, res: Response) {
  const result = await authService.updateUserProfile(req.user!.uid, req.body);
  sendSuccess(res, result, 'Profile updated');
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, result);
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.uid, req.body.newPassword);
  sendSuccess(res, null, 'Password reset successful');
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.uid, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, null, 'Password changed successfully');
}

export async function resetWithToken(req: Request, res: Response) {
  const { accessToken, newPassword } = req.body;
  await authService.resetWithToken(accessToken, newPassword);
  sendSuccess(res, null, 'Password reset successful');
}

export async function verifyHash(req: Request, res: Response) {
  const frontendUrl = env.FRONTEND_URL || '';
  res.redirect(302, `${frontendUrl}/reset-password${req.url.includes('#') ? '' : '#'}${req.url.split('#')[1] || ''}`);
}

export async function verifyToken(req: Request, res: Response) {
  sendSuccess(res, { valid: true });
}

export async function logout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token) {
      try {
        const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
        const supabase = getSupabaseAdmin();
        if (supabase) {
          await supabase.from('revoked_tokens').insert({ token_hash: tokenHash });
        }
      } catch {
        // ignore
      }
    }
  }
  res.clearCookie('token', { path: '/', ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}) });
  sendSuccess(res, null, 'Logged out successfully');
}

export async function refresh(req: Request, res: Response) {
  // Accept both snake_case (frontend sends) and camelCase (schema validates)
  const refresh_token = req.body.refresh_token || req.body.refreshToken;
  const result = await authService.refreshToken(refresh_token);

  const maxAge = 7 * 24 * 60 * 60 * 1000;
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });

  sendSuccess(res, result, 'Token refreshed');
}

export async function getSession(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.token;
  if (!token) {
    sendSuccess(res, null, 'No session');
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      sendSuccess(res, null, 'No session');
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.id) {
      sendSuccess(res, null, 'No session');
      return;
    }

    const profile = await authService.verifyUserToken(user.id);
    sendSuccess(res, { user: profile, uid: user.id });
  } catch {
    sendSuccess(res, null, 'No session');
  }
}
