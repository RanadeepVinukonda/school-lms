import { getSupabaseAdmin } from './supabase';
import { getUserByPhone } from '../database/auth';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { ServiceResult, success, failure } from '../types/service-result';

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

/** Register a new user via phone OTP flow. */
export async function register(data: {
  phone: string;
  displayName: string;
  role: string;
  photoURL?: string;
}): Promise<ServiceResult<UserProfile>> {
  try {
    const existing = await getUserByPhone(data.phone);
    if (existing) {
      return failure('A user with this phone number already exists', 'CONFLICT');
    }

    const now = new Date().toISOString();
    const placeholderEmail = `ph_${data.phone.replace(/[^0-9]/g, '')}@school.edu`;

    const userData: UserProfile = {
      id: '', email: placeholderEmail, displayName: data.displayName,
      role: data.role, phoneNumber: data.phone, photoURL: data.photoURL || '',
      isActive: true, createdAt: now, updatedAt: now,
    };

    logger.info('Phone registration initiated', { phone: data.phone, role: data.role });
    return success(userData);
  } catch (err: any) {
    return failure(err.message, 'REGISTER_ERROR');
  }
}

function stripCountry(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function getStoredOtp(phone: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const key = `otp:${phone}`;
  const { data, error } = await supabase
    .from('firestore_docs')
    .select('data')
    .eq('collection', 'otp_codes')
    .eq('doc_id', key)
    .maybeSingle();
  if (error) {
    logger.error('getStoredOtp query failed', { phone, key, error: error.message });
    return null;
  }
  if (!data) {
    logger.warn('getStoredOtp: no OTP found', { phone, key });
    return null;
  }
  const d = data.data as Record<string, unknown>;
  if (Date.now() > (d.expiresAt as number)) {
    logger.warn('getStoredOtp: OTP expired', { phone, key, expiresAt: d.expiresAt, now: Date.now() });
    await supabase.from('firestore_docs').delete().eq('collection', 'otp_codes').eq('doc_id', key);
    return null;
  }
  return d.code as string;
}

async function storeOtp(phone: string, code: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const key = `otp:${phone}`;
  const { error } = await supabase.from('firestore_docs').upsert({
    collection: 'otp_codes',
    doc_id: key,
    data: { code, phone, expiresAt: Date.now() + 5 * 60 * 1000, createdAt: Date.now() },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' });
  if (error) {
    logger.error('storeOtp upsert failed', { phone, key, error: error.message });
    throw new Error(`Failed to store OTP: ${error.message}`);
  }
}

function derivePassword(phone: string): string {
  return `lms_${phone.replace(/[^0-9]/g, '').slice(-6)}_pw`;
}

async function ensureAuthUser(phone: string, uid: string, role: string): Promise<{ uid: string; email: string }> {
  const supabase = getSupabaseAdmin();
  const email = `ph_${phone.replace(/[^0-9]/g, '')}@school.edu`;
  const pwd = derivePassword(phone);

  let authUser: any;
  try {
    const result = await supabase.auth.admin.getUserById(uid);
    authUser = result.data;
  } catch { authUser = null; }
  if (authUser?.user) {
    try { await supabase.auth.admin.updateUserById(uid, { password: pwd }); } catch {}
    return { uid, email };
  }

  const newId = uid || crypto.randomUUID();
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: pwd,
    email_confirm: true,
    user_metadata: { phone, role },
  });
  if (createErr) throw new Error(`Failed to create auth user: ${createErr.message}`);

  const authUid = created.user?.id || newId;

  const { error: upsertErr } = await supabase.from('users').upsert({
    id: authUid,
    email,
    display_name: phone,
    role: role || 'student',
    phone_number: phone,
    is_active: true,
    school_id: '00000000-0000-0000-0000-000000000001',
    class_ids: [],
    children_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (upsertErr) throw new Error(`Failed to upsert user: ${upsertErr.message}`);

  return { uid: authUid, email };
}

async function createSessionToken(email: string, phone: string): Promise<{ access_token: string; refresh_token: string } | null> {
  const supabase = getSupabaseAdmin();
  const pwd = derivePassword(phone);
  const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
  if (error || !session) return null;
  return { access_token: session.access_token, refresh_token: session.refresh_token };
}

/** Send OTP — returns fixed code for admin, random for others. */
export async function sendOtp(phone: string): Promise<ServiceResult<{ message: string; code?: string }>> {
  try {
    const isAdmin = stripCountry(phone).endsWith(stripCountry(env.ADMIN_PHONE));
    const code = isAdmin ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
    await storeOtp(phone, code);
    logger.info('OTP generated', { phone, code, isAdmin });

    return success({ message: 'OTP sent successfully', code });
  } catch (err: any) {
    return failure(err.message, 'OTP_ERROR');
  }
}

/** Verify locally-stored OTP and return session tokens. */
export async function verifyOtp(phone: string, token: string): Promise<ServiceResult<{ user: UserProfile; uid: string; token: string; refresh_token: string }>> {
  try {
    const supabase = getSupabaseAdmin();
    const isAdmin = stripCountry(phone).endsWith(stripCountry(env.ADMIN_PHONE));

    if (isAdmin && (token === '000000' || token === '123456')) {
      logger.info('Admin OTP bypass', { phone });
    } else {
      const stored = await getStoredOtp(phone);
      if (!stored || stored !== token) {
        return failure('Invalid or expired OTP', 'OTP_ERROR');
      }
      // Delete used OTP
      await supabase.from('firestore_docs').delete().eq('collection', 'otp_codes').eq('doc_id', `otp:${phone}`);
    }

    // Find or create user in users table
    let { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .filter('phone_number', 'eq', phone)
      .maybeSingle();

    let uid: string;
    let role = 'student';

    if (existingUser) {
      uid = existingUser.id;
      role = existingUser.role || 'student';
    } else {
      uid = crypto.randomUUID();
      role = isAdmin ? 'super_admin' : 'student';
    }

    // Ensure auth user exists in Supabase Auth
    const { uid: authUid, email: authEmail } = await ensureAuthUser(phone, uid, role);
    uid = authUid;

    // Ensure users table record exists
    if (!existingUser) {
      const { error: insertErr } = await supabase.from('users').insert({
        id: uid,
        email: authEmail,
        display_name: phone,
        role,
        phone_number: phone,
        is_active: true,
        school_id: '00000000-0000-0000-0000-000000000001',
        class_ids: [],
        children_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (insertErr) return failure(insertErr.message, 'DB_ERROR');
    }

    // Ensure admin gets super_admin role
    if (isAdmin) {
      await supabase.from('users').update({ role: 'super_admin' }).eq('id', uid);
      role = 'super_admin';
    }

    // Create session token
    const session = await createSessionToken(authEmail, phone);
    if (!session) return failure('Failed to create session', 'SESSION_ERROR');

    const { data: userRow } = await supabase.from('users').select('*').eq('id', uid).single();
    const userData = mapUserRow((userRow || { id: uid, role }) as Record<string, unknown>);

    logger.info('User logged in', { uid, phone, role });
    return success({
      user: userData,
      uid,
      token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (err: any) {
    return failure(err.message, 'OTP_ERROR');
  }
}

/** Verify a user's token by uid. Returns user profile. */
export async function verifyUserToken(uid: string): Promise<UserProfile> {
  const supabase = getSupabaseAdmin();
  const { data: userRow, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error || !userRow) throw new NotFoundError('User profile not found');
  return mapUserRow(userRow);
}

export { refreshToken, logout } from './auth-token.service';

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
