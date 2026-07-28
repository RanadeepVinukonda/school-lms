import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../services/supabase';
import { requireUser } from '../types/common';

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

export async function getProfile(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  const user = requireUser(req);
  const result = await authService.getUserProfile(user.uid);
  sendSuccess(res, result);
}

export async function updateProfile(req: Request, res: Response) {
  const user = requireUser(req);
  const result = await authService.updateUserProfile(user.uid, req.body);
  sendSuccess(res, result, 'Profile updated');
}

export async function verifyToken(_req: Request, res: Response) {
  sendSuccess(res, { valid: true });
}

export async function logout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token) {
      await authService.logout(token);
    }
  }
  res.clearCookie('token', { path: '/', ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}) });
  sendSuccess(res, null, 'Logged out successfully');
}

export async function refresh(req: Request, res: Response) {
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

export async function sendOtp(req: Request, res: Response) {
  const { phone } = req.body;
  const result = await authService.sendOtp(phone);
  sendSuccess(res, result, 'OTP sent');
}

export async function verifyOtpLogin(req: Request, res: Response) {
  const { phone, token } = req.body;
  const result = await authService.verifyOtp(phone, token);

  if (result.success && result.data) {
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('token', result.data.token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge,
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    });
  }

  sendSuccess(res, result, 'Login successful');
}

export async function getSession(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
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
