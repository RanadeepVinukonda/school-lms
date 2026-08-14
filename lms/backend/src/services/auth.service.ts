import { getSupabaseAdmin } from './supabase';
import { getUserByPhone } from '../database/auth';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
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
