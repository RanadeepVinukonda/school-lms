import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendSuccess } from '../utils/response';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

function getCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

function setCsrfCookie(res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: false,
    path: '/',
  });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const cookies = getCookies(req);
    if (!cookies[CSRF_COOKIE]) {
      setCsrfCookie(res, crypto.randomBytes(32).toString('hex'));
    }
    return next();
  }

  const cookies = getCookies(req);
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: { message: 'Invalid or missing CSRF token. Include x-csrf-token header matching csrf-token cookie.' },
    });
    return;
  }

  next();
}

export function csrfTokenHandler(_req: Request, res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  sendSuccess(res, { csrfToken: token });
}
