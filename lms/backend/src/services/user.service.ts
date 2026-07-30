import { getSupabaseAdmin } from './supabase';
import { createUser as createAuthUser, updateUser as updateAuthUser, deleteUser, getUserByPhone } from '../database/auth';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { deriveAcademicYear } from '../middlewares/academicYear.middleware';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { generateStudentId } from '../utils/studentIdGenerator.js';
import { generatePassword } from '../utils/passwordGenerator.js';
import { createNotification, createBulkNotifications } from './notification.service';
import { userCache } from '../utils/cache';

export async function getUserDoc(uid: string) {
  const { data, error } = await getSupabaseAdmin().from('users').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return { exists: !!data, data: data || null };
}

function stripPw<T extends Record<string, unknown>>(obj: T): Omit<T, 'password'> {
  const { password, ...rest } = obj;
  return rest;
}

export async function listUsers(query: {
  page?: string; limit?: string; role?: string; search?: string;
  status?: string; classId?: string; sortBy?: string; sortOrder?: string; schoolId?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { page, limit } = parsePagination(query);
  const offset = (page - 1) * limit;

  let q: any = supabase.from('users').select('*', { count: 'exact' });
  if (query.schoolId) q = q.eq('school_id', query.schoolId);
  if (query.role) q = q.eq('role', query.role);
  if (query.status) q = q.eq('is_active', query.status === 'active');
  if (query.classId) q = q.contains('class_ids', [query.classId]);
  q = q.order('created_at', { ascending: false });

  if (query.search) {
    const s = query.search.toLowerCase();
    q = q.or(`display_name.ilike.%${s}%,email.ilike.%${s}%,phone_number.ilike.%${s}%`);
  }

  const { data: rows, count } = await q.range(offset, offset + limit - 1);
  return { items: (rows || []).map(stripPw), total: count || 0, page, limit };
}

export async function getUserByIdService(uid: string) {
  const { exists, data } = await getUserDoc(uid);
  if (!exists || !data) throw new NotFoundError('User not found');
  return stripPw(data);
}

export async function createUser(data: {
  phone?: string; displayName: string; role: string;
  photoURL?: string; classIds?: string[]; classId?: string;
  rollNo?: number; gender?: string; childrenIds?: string[]; schoolId?: string; academicYear?: string;
}) {
  const supabase = getSupabaseAdmin();
  let studentId = '';
  let finalClassIds = data.classIds || [];
  let studentClassId = data.classId || '';

  if (data.role === 'student') {
    if (!data.classId) throw new ValidationError('Class ID is required for students');
    if (data.rollNo === undefined) throw new ValidationError('Roll number is required for students');
    const { data: classRow } = await supabase.from('classes').select('*').eq('id', data.classId).maybeSingle();
    if (!classRow) throw new NotFoundError('Assigned Class not found');

    const acYear = data.academicYear || classRow.academic_year || new Date().getFullYear().toString();
    const { data: existingWithRoll } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('class_id', data.classId)
      .eq('roll_no', data.rollNo)
      .eq('academic_year', acYear)
      .is('deleted_at', null)
      .maybeSingle();
    if (existingWithRoll) {
      throw new ConflictError(`Roll number ${data.rollNo} already assigned to ${existingWithRoll.display_name} in this class for academic year ${acYear}`);
    }

    const classCode = (classRow.code || classRow.section
      ? `${classRow.grade || ''}${classRow.section || ''}` : 'CLASS'
    ).toUpperCase().replace(/\s+/g, '');
    studentId = generateStudentId(acYear, classCode, data.rollNo);
    if (!finalClassIds.includes(data.classId)) finalClassIds.push(data.classId);
    studentClassId = data.classId;
  }

  const placeholderEmail = data.role === 'student' && studentId
    ? `${studentId.toLowerCase()}@school.edu`
    : `${data.displayName.replace(/\s+/g, '').toLowerCase()}@school.edu`;

  let resolvedChildrenIds = data.childrenIds || [];
  if (resolvedChildrenIds.length > 0) {
    const resolved = await Promise.all(
      resolvedChildrenIds.map(async (id) => {
        const { data: uRow } = await supabase.from('users').select('id').eq('student_id', id).maybeSingle();
        return uRow?.id || id;
      }),
    );
    resolvedChildrenIds = resolved;
  }

  if (data.phone) {
    const existingUser = await getUserByPhone(data.phone);
    if (existingUser) {
      const now = new Date().toISOString();
      const userData2 = {
        id: existingUser.uid, email: placeholderEmail, display_name: data.displayName,
        role: data.role, phone_number: data.phone || '', photo_url: data.photoURL || '',
        class_ids: finalClassIds, class_id: studentClassId || null,
        student_id: studentId || null, roll_no: data.rollNo || null,
        academic_year: deriveAcademicYear(), gender: data.gender || null,
        children_ids: resolvedChildrenIds, is_active: true, school_id: data.schoolId || null,
        created_at: now, updated_at: now,
      };
      const { error } = await supabase.from('users').upsert(userData2, { onConflict: 'id' });
      if (error) throw error;
      logger.info('User updated by admin', { uid: existingUser.uid, phone: data.phone, role: data.role });
      if (data.role === 'student') {
        const { error: rpcErr } = await supabase.rpc('increment_student_count', { class_id: data.classId!, delta: 1 });
        if (rpcErr) logger.warn('increment_student_count RPC failed', { classId: data.classId, error: rpcErr.message });
      }
      return stripPw(userData2);
    }
  }

  let authUser: Awaited<ReturnType<typeof createAuthUser>>;
  const autoPassword = generatePassword();
  try {
    authUser = await createAuthUser({
      phone: data.phone, displayName: data.displayName, photoURL: data.photoURL, password: autoPassword, email: placeholderEmail,
    });
  } catch (err: any) {
    logger.error('Auth user creation failed', { phone: data.phone, role: data.role, error: err.message, stack: err.stack });
    if (err.message?.toLowerCase().includes('already exists') || err.message?.toLowerCase().includes('already registered')) {
      const supabase = getSupabaseAdmin();
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find((u: any) => u.phone === data.phone);
      if (authUser) {
        const now = new Date().toISOString();
        const userData = {
          id: authUser.id, email: placeholderEmail, display_name: data.displayName,
          role: data.role, phone_number: data.phone || '', photo_url: data.photoURL || '',
          class_ids: finalClassIds, class_id: studentClassId || null,
          student_id: studentId || null, roll_no: data.rollNo || null,
          academic_year: deriveAcademicYear(), gender: data.gender || null,
          children_ids: resolvedChildrenIds, is_active: true, school_id: data.schoolId || null,
          created_at: now, updated_at: now,
        };
        const { error: upsertErr } = await supabase.from('users').upsert(userData, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
        logger.info('User recovered (auth existed, DB row created)', { uid: authUser.id, phone: data.phone, role: data.role });
  return { ...stripPw(userData), generatedPassword: autoPassword };
      }
    }
    if (err.message?.toLowerCase().includes('supabase') || err.message?.toLowerCase().includes('not configured')) {
      throw new ValidationError(`Auth service unavailable: ${err.message}`);
    }
    throw new ValidationError(`Failed to create user in auth system: ${err.message}`);
  }

  const now = new Date().toISOString();
  const userData: Record<string, unknown> = {
    id: authUser.uid, email: placeholderEmail, display_name: data.displayName,
    role: data.role, phone_number: data.phone || '', photo_url: data.photoURL || '',
    class_ids: finalClassIds, class_id: studentClassId || null,
    student_id: studentId || null, roll_no: data.rollNo || null,
    academic_year: deriveAcademicYear(), gender: data.gender || null,
    children_ids: resolvedChildrenIds, is_active: true, school_id: data.schoolId || null,
    created_at: now, updated_at: now,
  };
  const { error } = await supabase.from('users').upsert(userData, { onConflict: 'id' });
  if (error) throw error;
  logger.info('User created by admin', { uid: authUser.uid, phone: data.phone, role: data.role });

  if (data.role === 'student') {
    const { error: rpcErr } = await supabase.rpc('increment_student_count', { class_id: data.classId!, delta: 1 });
    if (rpcErr) logger.warn('increment_student_count RPC failed', { classId: data.classId, error: rpcErr.message });
  }

  try {
    const roleName = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    await createNotification({
      userId: authUser.uid, type: 'welcome', title: `Welcome to Genesis!`,
      body: `Welcome ${roleName}! Your account has been created successfully.`,
      data: { role: data.role },
    });
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('school_id', data.schoolId || null);
    if (admins && admins.length > 0) {
      const roleLabel = data.role === 'student' ? `Student ${data.displayName} (${studentId || ''})` : `${roleName} ${data.displayName}`;
      await createBulkNotifications(
        admins.map((a: any) => ({
          userId: a.id, type: 'registration', title: 'New Registration',
          body: `${roleLabel} registered.`,
          data: { uid: authUser.uid, role: data.role },
        }))
      );
    }
  } catch (err) {
    logger.warn('Failed to send welcome notification', { uid: authUser.uid, role: data.role, error: err });
  }

  return { ...stripPw(userData), generatedPassword: autoPassword };
}

export async function updateUser(uid: string, data: {
  displayName?: string; phoneNumber?: string; photoURL?: string; disabled?: boolean;
  classIds?: string[]; classId?: string; rollNo?: number;
  childrenIds?: string[]; gender?: string;
  version?: number; password?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { exists, data: existing } = await getUserDoc(uid);
  if (!exists || !existing) throw new NotFoundError('User not found');

  const currentVersion = (existing as Record<string, unknown>).version as number ?? 0;
  if (data.version !== undefined && data.version !== currentVersion) {
    throw new Error('Concurrent modification detected. Please retry.');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), version: currentVersion + 1 };
  if (data.displayName) updateData.display_name = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
  if (data.disabled !== undefined) updateData.is_active = !data.disabled;
  if (data.classIds !== undefined) updateData.class_ids = data.classIds;
  if (data.childrenIds !== undefined) {
    const resolved = await Promise.all(
      data.childrenIds.map(async (id) => {
        const { data: uRow } = await supabase.from('users').select('id').eq('student_id', id).maybeSingle();
        return uRow?.id || id;
      }),
    );
    updateData.children_ids = resolved;
  }
  if (data.gender !== undefined) updateData.gender = data.gender;

  const isStudent = existing.role === 'student';
  if (data.classId !== undefined) {
    updateData.class_id = data.classId;
    const existingClassIds = (existing.class_ids as string[]) || [];
    if (data.classId && !existingClassIds.includes(data.classId)) {
      updateData.class_ids = [...existingClassIds, data.classId];
    }
  }
  if (data.rollNo !== undefined) updateData.roll_no = data.rollNo;

  if (isStudent && (data.classId !== undefined || data.rollNo !== undefined)) {
    const finalClassId = data.classId !== undefined ? data.classId : existing.class_id;
    const finalRollNo = data.rollNo !== undefined ? data.rollNo : existing.roll_no;
    if (finalClassId && finalRollNo !== undefined) {
      const { data: cls } = await supabase.from('classes').select('*').eq('id', finalClassId).maybeSingle();
      if (cls) {
        const classCode = (cls.code || cls.section ? `${cls.grade || ''}${cls.section || ''}` : 'CLASS').toUpperCase().replace(/\s+/g, '');
        updateData.student_id = generateStudentId(deriveAcademicYear(), classCode, finalRollNo);
      }
    }
  }

  const { error: updErr } = await supabase.from('users').update(updateData).eq('id', uid).eq('version', currentVersion);
  if (updErr) throw updErr;

  if (data.disabled !== undefined) await updateAuthUser(uid, { disabled: data.disabled });

  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  if (!updated) throw new Error('Concurrent modification detected. Please retry.');
  logger.info('User updated by admin', { uid });
  userCache.invalidate(uid);
  return updated ? stripPw(updated) : null;
}

export async function deleteUserService(uid: string) {
  const { exists } = await getUserDoc(uid);
  if (!exists) throw new NotFoundError('User not found');
  const { error } = await getSupabaseAdmin().from('users').update({ deleted_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw error;
  try {
    await deleteUser(uid);
  } catch (err: any) {
    logger.warn('Failed to delete user from Supabase Auth (non-critical)', { uid, error: err.message });
  }
  logger.info('User deleted by admin', { uid });
}

export async function toggleActive(uid: string) {
  const supabase = getSupabaseAdmin();
  const { exists, data: existing } = await getUserDoc(uid);
  if (!exists || !existing) throw new NotFoundError('User not found');

  const newIsActive = !existing.is_active;
  const { error } = await supabase.from('users').update({ is_active: newIsActive, updated_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to toggle user active status: ${error.message}`);
  await updateUser(uid, { disabled: !newIsActive });

  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  logger.info('User active status toggled', { uid, isActive: newIsActive });
  return updated ? stripPw(updated) : null;
}

export async function updateProfile(uid: string, data: {
  displayName?: string; phoneNumber?: string; photoURL?: string; language?: string;
  version?: number;
}) {
  const supabase = getSupabaseAdmin();
  const { exists, data: existing } = await getUserDoc(uid);
  if (!exists || !existing) throw new NotFoundError('User not found');

  const currentVersion = (existing as Record<string, unknown>).version as number ?? 0;
  if (data.version !== undefined && data.version !== currentVersion) {
    throw new Error('Concurrent modification detected. Please retry.');
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString(), version: currentVersion + 1 };
  if (data.displayName) updateData.display_name = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
  if (data.language !== undefined) updateData.language = data.language;

  const { error } = await supabase.from('users').update(updateData).eq('id', uid).eq('version', currentVersion);
  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
  userCache.invalidate(uid);
  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  return updated ? stripPw(updated) : null;
}

export { assignRole, pingActive, getStrengthsWeaknesses } from './user-role.service';
