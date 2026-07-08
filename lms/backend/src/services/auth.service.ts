import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getSupabaseClient } from './supabase';
import { createUser as firebaseCreateUser, getUserByEmail, getUserById, setCustomClaims, updateUser as firebaseUpdateUser } from '../database/auth';
import { validatePassword } from '../utils/passwordValidation';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError, AppError, RateLimitError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoURL?: string;
  isActive: boolean;
  classIds?: string[];
  classId?: string;
  studentId?: string;
  rollNo?: string;
  academicYear?: string;
  childrenIds?: string[];
  gender?: string;
  streakCount?: number;
  lastActiveDate?: string;
  language?: string;
  tutorialSeen?: boolean;
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapUserRow(row: Record<string, unknown>): UserProfile {
  const data = (row.data as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    email: row.email as string,
    displayName: (row.display_name as string) ?? (data.displayName as string) ?? '',
    role: (row.role as string) || 'student',
    phoneNumber: (row.phone_number as string) ?? (data.phoneNumber as string),
    photoURL: (row.photo_url as string) ?? (data.photoURL as string),
    isActive: (row.is_active as boolean) ?? (data.isActive as boolean) ?? true,
    classIds: (row.class_ids as string[]) ?? (data.classIds as string[]),
    classId: (row.class_id as string) ?? (data.classId as string),
    studentId: (row.student_id as string) ?? (data.studentId as string),
    rollNo: (row.roll_no as string) ?? (data.rollNo as string),
    academicYear: (row.academic_year as string) ?? (data.academicYear as string),
    childrenIds: (row.children_ids as string[]) ?? (data.childrenIds as string[]),
    gender: (row.gender as string) ?? (data.gender as string),
    streakCount: (row.streak_count as number) ?? (data.streakCount as number),
    lastActiveDate: (row.last_active_date as string) ?? (data.lastActiveDate as string),
    language: (row.language as string) ?? (data.language as string),
    tutorialSeen: (row.tutorial_seen as boolean) ?? (data.tutorialSeen as boolean),
    schoolId: (row.school_id as string) ?? (data.schoolId as string),
    createdAt: (row.created_at as string) ?? (data.createdAt as string),
    updatedAt: (row.updated_at as string) ?? (data.updatedAt as string),
  };
}

/** Register a new user in both Firebase Auth and Supabase. */
export async function register(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<UserProfile> {
  const pwCheck = validatePassword(data.password);
  if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));

  const existingUser = await getUserByEmail(data.email);
  if (existingUser) {
    if (data.role === 'parent' && existingUser.role === 'teacher') {
      logger.info('Teacher re-registered as parent', { uid: existingUser.uid, email: data.email });
      return {
        id: existingUser.uid,
        email: data.email,
        displayName: data.displayName,
        role: existingUser.role,
        isActive: true,
      };
    }
    throw new ConflictError('A user with this email already exists');
  }

  const firebaseUser = await firebaseCreateUser({
    email: data.email,
    password: data.password,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    photoURL: data.photoURL,
  });

  await setCustomClaims(firebaseUser.uid, { role: data.role });

  const now = new Date().toISOString();
  const userData: UserProfile = {
    id: firebaseUser.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    phoneNumber: data.phoneNumber || '',
    photoURL: data.photoURL || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const dbData: Record<string, unknown> = {
    id: userData.id,
    email: userData.email,
    display_name: userData.displayName,
    role: userData.role,
    phone_number: userData.phoneNumber,
    photo_url: userData.photoURL,
    is_active: userData.isActive,
    created_at: now,
    updated_at: now,
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('users').insert(dbData);
  if (error) throw error;

  logger.info('User registered', { uid: userData.id, email: data.email, role: data.role });
  return userData;
}

/** Authenticate a user by email and password using Supabase Auth REST API. */
export async function login(email: string, password: string): Promise<{ user: UserProfile; uid: string; token: string }> {
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: email.toLowerCase(), password }),
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new UnauthorizedError((body as { error_description?: string }).error_description || 'Invalid email or password');
  }

  const data = await response.json() as { user?: { id: string }; access_token?: string; refresh_token?: string };
  const uid = data.user?.id;
  if (!uid) throw new UnauthorizedError('Authentication failed');

  const supabase = getSupabaseAdmin();
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (userError || !userRow) {
    throw new UnauthorizedError('User not found');
  }

  const userData = mapUserRow(userRow);
  if (!userData.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  logger.info('User logged in', { uid, email });
  return { user: userData, uid, token: data.access_token || '' };
}

/** Verify a user's token by uid. Returns user profile. */
export async function verifyUserToken(uid: string): Promise<UserProfile> {
  const user = await getUserById(uid);
  if (!user) throw new UnauthorizedError('User not found');

  const supabase = getSupabaseAdmin();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error || !userRow) throw new NotFoundError('User profile not found');
  return mapUserRow(userRow);
}

/** Send password reset email via Supabase Admin REST API. */
export async function forgotPassword(email: string) {
  const redirectTo = `${env.FRONTEND_URL}/reset-password`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
  };

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: email.toLowerCase(), redirect_to: redirectTo }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('Failed to send password reset email', { email, status: res.status, body });
    if (res.status === 429) throw new RateLimitError('Too many requests. Please wait at least 60 seconds and try again.');
    throw new AppError(502, 'Failed to send reset email. Please try again later.');
  }

  logger.info('Password reset email sent via Supabase', { email });
  return { message: 'If the email exists, a reset link has been sent' };
}

/** Reset password using a Supabase access token (from recovery hash). */
export async function resetWithToken(accessToken: string, newPassword: string): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    apikey: env.SUPABASE_ANON_KEY,
  };

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) {
    const body = await userRes.text();
    logger.error('Invalid or expired access token', { status: userRes.status, body });
    throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');
  }

  const userData = await userRes.json() as { id?: string };
  if (!userData.id) throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');

  await resetPassword(userData.id, newPassword);
}

/** Reset a password using Supabase Admin REST API (bypasses client rate limits). */
export async function resetPassword(uid: string, newPassword: string): Promise<void> {
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));

  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to reset password', { uid, status: response.status, body });
    throw new AppError(502, 'Failed to reset password');
  }

  logger.info('Password reset completed via Supabase Admin', { uid });
}

/** Change a user's password. Verifies current password, then updates via Admin API. */
export async function changePassword(uid: string, currentPassword: string, newPassword: string): Promise<void> {
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));

  const supabase = getSupabaseAdmin();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error || !userRow) throw new NotFoundError('User not found');
  const userData = mapUserRow(userRow);

  // Verify current password using a temporary client
  const tempClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const { error: signInError } = await tempClient.auth.signInWithPassword({
    email: userData.email,
    password: currentPassword,
  });
  if (signInError) throw new UnauthorizedError('Current password is incorrect');
  await tempClient.auth.signOut();

  await firebaseUpdateUser(uid, { password: newPassword });
  logger.info('Password changed', { uid });
}

/** Refresh an auth token using a refresh token via Supabase REST API. */
export async function refreshToken(refreshToken: string): Promise<{ token: string; refresh_token: string; uid: string }> {
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );

  if (!response.ok) throw new UnauthorizedError('Invalid or expired refresh token');

  const data = await response.json() as { access_token?: string; refresh_token?: string; user?: { id: string } };
  return {
    token: data.access_token || '',
    refresh_token: data.refresh_token || '',
    uid: data.user?.id || '',
  };
}

/** Fetch user profile by uid. */
export async function getUserProfile(uid: string): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error || !userRow) throw new NotFoundError('User not found');
  return mapUserRow(userRow);
}

/** Update a user's own profile fields. */
export async function updateUserProfile(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  const { data: userRow, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (findError || !userRow) throw new NotFoundError('User not found');

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.displayName) updateData.display_name = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;

  const { error: updateError } = await supabase.from('users').update(updateData).eq('id', uid);
  if (updateError) throw updateError;

  const { data: updatedUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (fetchError || !updatedUser) throw new NotFoundError('User not found');
  return mapUserRow(updatedUser);
}
