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

export async function verifyHash(_req: Request, res: Response) {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Password - School LMS</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 32px; width: 100%; max-width: 400px; }
  h1 { font-size: 22px; color: #1e293b; margin-bottom: 8px; text-align: center; }
  p { font-size: 14px; color: #64748b; margin-bottom: 24px; text-align: center; }
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
  input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
  button { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  button:disabled { background: #94a3b8; cursor: not-allowed; }
  .error { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; }
  .success { background: #f0fdf4; color: #16a34a; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: none; text-align: center; }
  .loader { display: none; text-align: center; margin-top: 24px; }
  .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin .6s linear infinite; margin: 0 auto 12px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="card" id="formCard">
  <h1>Reset Password</h1>
  <p id="statusText">Enter your new password below.</p>
  <div class="error" id="errorMsg"></div>
  <div class="success" id="successMsg">Password reset successfully! <a href="/" style="color:#2563eb;">Sign in</a></div>
  <div class="form-group">
    <label for="password">New Password</label>
    <input type="password" id="password" placeholder="At least 8 characters" autocomplete="new-password">
  </div>
  <div class="form-group">
    <label for="confirm">Confirm Password</label>
    <input type="password" id="confirm" placeholder="Repeat password" autocomplete="new-password">
  </div>
  <button id="submitBtn" onclick="handleReset()">Reset Password</button>
  <div class="loader" id="loader">
    <div class="spinner"></div>
    <p style="font-size:13px;color:#64748b;">Resetting password...</p>
  </div>
</div>
<script>
  function getParam(name) {
    const hash = window.location.hash.replace('#','');
    const params = new URLSearchParams(hash);
    return params.get(name);
  }
  const accessToken = getParam('access_token');
  const type = getParam('type');
  document.getElementById('statusText').textContent =
    type === 'recovery' ? 'Enter your new password below.' : 'Invalid reset link.';

  async function handleReset() {
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const errEl = document.getElementById('errorMsg');

    if (!password || password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.style.display = 'block'; return; }
    if (password !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.style.display = 'block'; return; }
    if (!accessToken) { errEl.textContent = 'Invalid reset link'; errEl.style.display = 'block'; return; }

    errEl.style.display = 'none';
    document.getElementById('loader').style.display = 'block';
    document.getElementById('submitBtn').disabled = true;

    try {
      const r = await fetch('/auth/reset-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, newPassword: password })
      });
      const d = await r.json();
      if (d.success) {
        document.getElementById('formCard').querySelectorAll('.form-group,#submitBtn').forEach(e => e.remove());
        document.getElementById('statusText').remove();
        document.getElementById('successMsg').style.display = 'block';
      } else {
        errEl.textContent = d.error?.message || 'Reset failed';
        errEl.style.display = 'block';
      }
    } catch(e) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.style.display = 'block';
    } finally {
      document.getElementById('loader').style.display = 'none';
      document.getElementById('submitBtn').disabled = false;
    }
  }
</script>
</body>
</html>`);
}

export async function verifyToken(req: Request, res: Response) {
  sendSuccess(res, { valid: true });
}

export async function logout(req: Request, res: Response) {
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
