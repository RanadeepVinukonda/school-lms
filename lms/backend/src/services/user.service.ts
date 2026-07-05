import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { createUser as firebaseCreateUser, updateUser as firebaseUpdateUser, deleteUser as firebaseDeleteUser, getUserByEmail, getUserById, setCustomClaims } from '../database/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { generateStudentId } from '../utils/studentIdGenerator.js';
import { generatePassword } from '../utils/passwordGenerator.js';
import { validatePassword } from '../utils/passwordValidation';

async function getUserDoc(uid: string) {
  const { data, error } = await getSupabaseAdmin()!.from('users').select('*').eq('id', uid).maybeSingle();
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
  const supabase = getSupabaseAdmin()!;
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
    q = q.or(`display_name.ilike.%${s}%,email.ilike.%${s}%`);
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
  email?: string; password?: string; displayName: string; role: string;
  phoneNumber?: string; photoURL?: string; classIds?: string[]; classId?: string;
  rollNo?: number; academicYear?: string; gender?: string; childrenIds?: string[]; schoolId?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  let studentId = '';
  let finalClassIds = data.classIds || [];
  let studentClassId = data.classId || '';

  if (data.role === 'student') {
    if (!data.classId) throw new ValidationError('Class ID is required for students');
    if (data.rollNo === undefined) throw new ValidationError('Roll number is required for students');
    const { data: classRow } = await supabase.from('classes').select('*').eq('id', data.classId).maybeSingle();
    if (!classRow) throw new NotFoundError('Assigned Class not found');
    const classCode = (classRow.code || classRow.section
      ? `${classRow.grade || ''}${classRow.section || ''}` : 'CLASS'
    ).toUpperCase().replace(/\s+/g, '');
    const acYear = data.academicYear || classRow.academic_year || new Date().getFullYear().toString();
    studentId = generateStudentId(acYear, classCode, data.rollNo);
    if (!finalClassIds.includes(data.classId)) finalClassIds.push(data.classId);
    studentClassId = data.classId;
  }

  let generatedEmail = data.email || (data.role === 'student'
    ? `${studentId.toLowerCase()}@school.edu`
    : `${data.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.edu`);
  if (!data.email) {
    let suffix = 0;
    let unique = generatedEmail;
    while (true) {
      const existingUser = await getUserByEmail(unique);
      if (!existingUser) break;
      suffix++;
      unique = generatedEmail.replace('@', `${suffix}@`);
    }
    generatedEmail = unique;
  }

  const generatedPassword = data.password || generatePassword();

  // Validate caller-supplied password (generated passwords are always valid)
  if (data.password) {
    const pwCheck = validatePassword(data.password);
    if (!pwCheck.valid) throw new ValidationError(pwCheck.errors.join('; '));
  }

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

  if (generatedEmail) {
    const existingUser = await getUserByEmail(generatedEmail);
    if (existingUser) {
      if (data.role === 'parent' && existingUser.role === 'teacher') {
        const now = new Date().toISOString();
        const updateData: Record<string, unknown> = { updated_at: now };
        if (data.childrenIds?.length) updateData.childrenIds = resolvedChildrenIds;
        const { error: updateErr } = await supabase.from('users').update(updateData).eq('id', existingUser.uid);
        if (updateErr) throw new Error(`Failed to update user: ${updateErr.message}`);
        logger.info('Teacher updated with childrenIds by admin', { uid: existingUser.uid, email: generatedEmail });
        const { data: uRow } = await supabase.from('users').select('*').eq('id', existingUser.uid).maybeSingle();
        if (uRow) return stripPw(uRow);
      }
      const { data: uRow } = await supabase.from('users').select('*').eq('id', existingUser.uid).maybeSingle();
      if (uRow) {
        logger.info('Existing user reused by admin (no role change)', { uid: existingUser.uid, email: generatedEmail, role: existingUser.role });
        return stripPw(uRow);
      }
      const now2 = new Date().toISOString();
      const userData2 = {
        id: existingUser.uid, email: generatedEmail, display_name: data.displayName,
        role: data.role, phone_number: data.phoneNumber || '', photo_url: data.photoURL || '',
        class_ids: finalClassIds, class_id: studentClassId || null,
        student_id: studentId || null, roll_no: data.rollNo || null,
        academic_year: data.academicYear || null, gender: data.gender || null,
        children_ids: resolvedChildrenIds, is_active: true, school_id: data.schoolId || '',
        created_at: now2, updated_at: now2,
      };
      const { error } = await supabase.from('users').upsert(userData2, { onConflict: 'id' });
      if (error) throw error;
      await firebaseUpdateUser(existingUser.uid, { password: generatedPassword });
      await setCustomClaims(existingUser.uid, { role: data.role });
      logger.info('User doc created (auth user existed)', { uid: existingUser.uid, email: generatedEmail, role: data.role });
      if (data.role === 'student') {
        const { error: rpcErr } = await supabase.rpc('increment_student_count', { class_id: data.classId!, delta: 1 });
        if (rpcErr) {
          // Fallback: read-then-write (best-effort if RPC not deployed)
          const { data: cls } = await supabase.from('classes').select('student_count').eq('id', data.classId!).maybeSingle();
          const currentCount = cls?.student_count || 0;
          const { error: classUpdateErr } = await supabase.from('classes').update({ student_count: currentCount + 1, updated_at: now2 }).eq('id', data.classId!);
          if (classUpdateErr) throw new Error(`Failed to update class student count: ${classUpdateErr.message}`);
        }
      }
      return { ...userData2, generatedPassword };
    }
  }

  const firebaseUser = await firebaseCreateUser({
    email: generatedEmail, password: generatedPassword,
    displayName: data.displayName, phoneNumber: data.phoneNumber, photoURL: data.photoURL,
  });

  const now = new Date().toISOString();
  const userData: Record<string, unknown> = {
    id: firebaseUser.uid, email: generatedEmail, display_name: data.displayName,
    role: data.role, phone_number: data.phoneNumber || '', photo_url: data.photoURL || '',
    class_ids: finalClassIds, class_id: studentClassId || null,
    student_id: studentId || null, roll_no: data.rollNo || null,
    academic_year: data.academicYear || null, gender: data.gender || null,
    children_ids: resolvedChildrenIds, is_active: true, school_id: data.schoolId || '',
    created_at: now, updated_at: now,
  };
  const { error } = await supabase.from('users').upsert(userData, { onConflict: 'id' });
  if (error) throw error;
  await setCustomClaims(firebaseUser.uid, { role: data.role });
  logger.info('User created by admin', { uid: firebaseUser.uid, email: generatedEmail, role: data.role });

  if (data.role === 'student') {
    const { error: rpcErr } = await supabase.rpc('increment_student_count', { class_id: data.classId!, delta: 1 });
    if (rpcErr) {
      // Fallback: read-then-write (best-effort if RPC not deployed)
      const { data: cls } = await supabase.from('classes').select('student_count').eq('id', data.classId!).maybeSingle();
      const currentCount = cls?.student_count || 0;
      const { error: classUpdateErr } = await supabase.from('classes').update({ student_count: currentCount + 1, updated_at: now }).eq('id', data.classId!);
      if (classUpdateErr) throw new Error(`Failed to update class student count: ${classUpdateErr.message}`);
    }
  }

  const { password: _pw, ...userDataSafe } = userData as any;
  return { ...userDataSafe, generatedPassword };
}

export async function updateUser(uid: string, data: {
  displayName?: string; phoneNumber?: string; photoURL?: string; disabled?: boolean;
  classIds?: string[]; classId?: string; rollNo?: number; academicYear?: string;
  childrenIds?: string[]; gender?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { exists, data: existing } = await getUserDoc(uid);
  if (!exists || !existing) throw new NotFoundError('User not found');

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
  if (data.academicYear !== undefined) updateData.academic_year = data.academicYear;

  if (isStudent && (data.classId !== undefined || data.rollNo !== undefined || data.academicYear !== undefined)) {
    const finalClassId = data.classId !== undefined ? data.classId : existing.class_id;
    const finalRollNo = data.rollNo !== undefined ? data.rollNo : existing.roll_no;
    const finalAcademicYear = data.academicYear !== undefined ? data.academicYear : existing.academic_year;
    if (finalClassId && finalRollNo !== undefined) {
      const { data: cls } = await supabase.from('classes').select('*').eq('id', finalClassId).maybeSingle();
      if (cls) {
        const classCode = (cls.code || cls.section ? `${cls.grade || ''}${cls.section || ''}` : 'CLASS').toUpperCase().replace(/\s+/g, '');
        const acYear = finalAcademicYear || cls.academic_year || new Date().getFullYear().toString();
        updateData.student_id = generateStudentId(acYear, classCode, finalRollNo);
      }
    }
  }

  const { error: updErr } = await supabase.from('users').update(updateData).eq('id', uid);
  if (updErr) throw updErr;

  if (data.disabled !== undefined) await firebaseUpdateUser(uid, { disabled: data.disabled });

  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  logger.info('User updated by admin', { uid });
  return updated ? stripPw(updated) : null;
}

export async function deleteUserService(uid: string) {
  const { exists } = await getUserDoc(uid);
  if (!exists) throw new NotFoundError('User not found');
  const { error } = await getSupabaseAdmin()!.from('users').delete().eq('id', uid);
  if (error) throw error;
  await firebaseDeleteUser(uid);
  logger.info('User deleted by admin', { uid });
}

export async function toggleActive(uid: string) {
  const supabase = getSupabaseAdmin()!;
  const { exists, data: existing } = await getUserDoc(uid);
  if (!exists || !existing) throw new NotFoundError('User not found');

  const newIsActive = !existing.is_active;
  const { error } = await supabase.from('users').update({ is_active: newIsActive, updated_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to toggle user active status: ${error.message}`);
  await firebaseUpdateUser(uid, { disabled: !newIsActive });

  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  logger.info('User active status toggled', { uid, isActive: newIsActive });
  return updated ? stripPw(updated) : null;
}

export async function assignRole(uid: string, role: string) {
  const supabase = getSupabaseAdmin()!;
  const { exists } = await getUserDoc(uid);
  if (!exists) throw new NotFoundError('User not found');

  const { error } = await supabase.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to assign user role: ${error.message}`);
  await setCustomClaims(uid, { role });
  logger.info('User role assigned', { uid, role });
}

export async function pingActive(uid: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: existing } = await supabase.from('users').select('last_active_date, streak_count').eq('id', uid).maybeSingle();
  if (!existing) throw new NotFoundError('User not found');

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const lastActive = existing.last_active_date ? new Date(existing.last_active_date) : null;
  let streakCount = existing.streak_count ?? 0;

  if (lastActive) {
    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) streakCount += 1;
    else if (diffDays > 1) streakCount = 1;
  } else {
    streakCount = 1;
  }

  const { error } = await supabase.from('users').update({ streak_count: streakCount, last_active_date: today.toISOString() }).eq('id', uid);
  if (error) throw new Error(`Failed to update user streak: ${error.message}`);
  return { streakCount, lastActiveDate: today.toISOString() };
}

export async function getStrengthsWeaknesses(uid: string) {
  const supabase = getSupabaseAdmin()!;
  const { data: quizRows } = await supabase.from('nosql_docs').select('data').eq('collection', 'quizAttempts').contains('data', { studentId: uid });
  const { data: examRows } = await supabase.from('nosql_docs').select('data').eq('collection', 'examAttempts').contains('data', { studentId: uid });

  const conceptScores: Record<string, { totalScore: number; totalMax: number; count: number }> = {};

  for (const row of [...(quizRows || []), ...(examRows || [])]) {
    const data = row.data as Record<string, unknown> || {};
    const conceptIds: string[] = (data.conceptIds as string[]) ?? (data.conceptId ? [data.conceptId as string] : []);
    const score = (data.score as number) ?? 0;
    const maxScore = (data.maxScore as number) ?? (data.totalPoints as number) ?? 100;
    for (const cid of conceptIds) {
      if (!cid) continue;
      if (!conceptScores[cid]) conceptScores[cid] = { totalScore: 0, totalMax: 0, count: 0 };
      conceptScores[cid].totalScore += score;
      conceptScores[cid].totalMax += maxScore;
      conceptScores[cid].count += 1;
    }
  }

  const strong: string[] = [];
  const weak: string[] = [];
  const details: Record<string, { name: string; averageScore: number; attemptCount: number }> = {};

  for (const [cid, d] of Object.entries(conceptScores)) {
    const averageScore = d.totalMax > 0 ? Math.round((d.totalScore / d.totalMax) * 100) : 0;
    details[cid] = { name: cid, averageScore, attemptCount: d.count };
    if (averageScore >= 70) strong.push(cid);
    else weak.push(cid);
  }

  return { strongConceptIds: strong, weakConceptIds: weak, conceptDetails: details };
}

export async function updateProfile(uid: string, data: {
  displayName?: string; phoneNumber?: string; photoURL?: string; language?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const { exists } = await getUserDoc(uid);
  if (!exists) throw new NotFoundError('User not found');

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.displayName) updateData.display_name = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phone_number = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
  if (data.language !== undefined) updateData.language = data.language;

  const { error } = await supabase.from('users').update(updateData).eq('id', uid);
  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
  const { data: updated } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  return updated ? stripPw(updated) : null;
}
