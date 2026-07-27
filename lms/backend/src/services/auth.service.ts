import { getSupabaseAdmin } from './supabase';
import { createUser, getUserByEmail, getUserById, setCustomClaims } from '../database/auth';
import { validatePassword } from '../utils/passwordValidation';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ServiceResult, success, failure } from '../types/service-result';

// ── Account lockout ──

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, { count: number; lockedUntil: number }>();

export function checkAccountLockout(email: string): { locked: boolean; retryAfterMs?: number } {
  const entry = failedLogins.get(email.toLowerCase());
  if (!entry) return { locked: false };
  if (Date.now() < entry.lockedUntil) return { locked: true, retryAfterMs: entry.lockedUntil - Date.now() };
  failedLogins.delete(email.toLowerCase());
  return { locked: false };
}

export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const entry = failedLogins.get(key);
  const count = (entry?.count ?? 0) + 1;
  failedLogins.set(key, {
    count,
    lockedUntil: count >= MAX_FAILED ? Date.now() + LOCKOUT_MS : 0,
  });
}

export function clearFailedLogins(email: string): void {
  failedLogins.delete(email.toLowerCase());
}

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
}): Promise<ServiceResult<UserProfile>> {
  try {
    const pwCheck = validatePassword(data.password);
    if (!pwCheck.valid) return failure(pwCheck.errors.join('; '), 'VALIDATION');

    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      if (data.role === 'parent' && existingUser.role === 'teacher') {
        logger.info('Teacher re-registered as parent', { uid: existingUser.uid, email: data.email });
        return success({
          id: existingUser.uid,
          email: data.email,
          displayName: data.displayName,
          role: existingUser.role,
          isActive: true,
        });
      }
      return failure('A user with this email already exists', 'CONFLICT');
    }

    const authUser = await createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      phoneNumber: data.phoneNumber,
      photoURL: data.photoURL,
    });

    await setCustomClaims(authUser.uid, { role: data.role });

    const now = new Date().toISOString();
    const userData: UserProfile = {
      id: authUser.uid,
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
    if (error) return failure(error.message, 'DB_ERROR');

    logger.info('User registered', { uid: userData.id, email: data.email, role: data.role });
    return success(userData);
  } catch (err: any) {
    return failure(err.message, 'REGISTER_ERROR');
  }
}

/** Authenticate a user by email and password using Supabase Auth REST API. */
export async function login(email: string, password: string): Promise<ServiceResult<{ user: UserProfile; uid: string; token: string }>> {
  try {
    const lockout = checkAccountLockout(email);
    if (lockout.locked) {
      return failure(`Account locked. Try again in ${Math.ceil((lockout.retryAfterMs || 0) / 60000)} minutes`, 'LOCKED');
    }

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
      recordFailedLogin(email);
      return failure((body as { error_description?: string }).error_description || 'Invalid email or password', 'AUTH_FAILED');
    }

    const result = await response.json() as { user?: { id: string }; access_token?: string; refresh_token?: string };
    const uid = result.user?.id;
    if (!uid) return failure('Authentication failed', 'AUTH_FAILED');

    const supabase = getSupabaseAdmin();
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (userError || !userRow) {
      return failure('User not found', 'NOT_FOUND');
    }

    const userData = mapUserRow(userRow);
    if (!userData.isActive) {
      return failure('Account is disabled', 'DISABLED');
    }

    clearFailedLogins(email);
    logger.info('User logged in', { uid, email });
    return success({ user: userData, uid, token: result.access_token || '' });
  } catch (err: any) {
    return failure(err.message, 'LOGIN_ERROR');
  }
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

export { forgotPassword, resetWithToken, resetPassword, changePassword, refreshToken, logout } from './auth-token.service';

/** Fetch user profile by uid. */
export async function getUserProfile(uid: string): Promise<ServiceResult<UserProfile>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: userRow, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) return failure(error.message, 'DB_ERROR');
    if (!userRow) return failure('User not found', 'NOT_FOUND');
    return success(mapUserRow(userRow));
  } catch (err: any) {
    return failure(err.message, 'GET_PROFILE_ERROR');
  }
}

/** Update a user's own profile fields. */
export async function updateUserProfile(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<ServiceResult<UserProfile>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: userRow, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (findError) return failure(findError.message, 'DB_ERROR');
    if (!userRow) return failure('User not found', 'NOT_FOUND');

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.displayName) updateData.display_name = data.displayName;
    if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
    if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;

    const { error: updateError } = await supabase.from('users').update(updateData).eq('id', uid);
    if (updateError) return failure(updateError.message, 'DB_ERROR');

    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();

    if (fetchError) return failure(fetchError.message, 'DB_ERROR');
    if (!updatedUser) return failure('User not found', 'NOT_FOUND');
    return success(mapUserRow(updatedUser));
  } catch (err: any) {
    return failure(err.message, 'UPDATE_PROFILE_ERROR');
  }
}
