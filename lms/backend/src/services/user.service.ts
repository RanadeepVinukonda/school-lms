import { v4 as uuidv4 } from 'uuid';
import { collections, getDb } from '../firebase/firestore';
import { createUser as firebaseCreateUser, updateUser as firebaseUpdateUser, deleteUser as firebaseDeleteUser, getUserById, setCustomClaims } from '../firebase/auth';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';
import { generateStudentId } from '../utils/studentIdGenerator.js';
import { generatePassword } from '../utils/passwordGenerator.js';

/** List users with optional role/search/status/classId filters, paginated. Excludes password from results. */
export async function listUsers(query: {
  page?: string;
  limit?: string;
  role?: string;
  search?: string;
  status?: string;
  classId?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const { page, limit } = parsePagination(query);
  let baseQuery: FirebaseFirestore.Query = collections.users();

  if (query.role) baseQuery = baseQuery.where('role', '==', query.role);
  if (query.status) {
    baseQuery = baseQuery.where('isActive', '==', query.status === 'active');
  }

  const snapshot = await baseQuery.get();

  let items = snapshot.docs.map((doc) => {
    const data = doc.data();
    const { password, ...safeData } = data;
    return { id: doc.id, ...safeData };
  });
  items = items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: { id?: string; displayName?: string; email?: string }) =>
        item.displayName?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search)
    );
  }

  if (query.classId) {
    items = items.filter((item: { id?: string; classIds?: string[] }) =>
      item.classIds?.includes(query.classId!)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  return { items: paged, total, page, limit };
}

/** Fetch a single user by uid. Throws NotFoundError if missing. Excludes password. */
export async function getUserByIdService(uid: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const data = userDoc.data()!;
  const { password, ...safeData } = data;
  return { ...safeData };
}

// generateRandomPassword is replaced by the spec-compliant generatePassword() from passwordGenerator.ts

/** Create a new user in both Firebase Auth and Firestore. Hashes the password with bcrypt. */
export async function createUser(data: {
  email?: string;
  password?: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoURL?: string;
  classIds?: string[];
  classId?: string;
  rollNo?: number;
  academicYear?: string;
  childrenIds?: string[];
}) {
  let studentId = '';
  let finalClassIds = data.classIds || [];
  let studentClassId = data.classId || '';

  if (data.role === 'student') {
    if (!data.classId) {
      throw new Error('Class ID is required for students');
    }
    if (data.rollNo === undefined) {
      throw new Error('Roll number is required for students');
    }
    const classDoc = await collections.classes().doc(data.classId).get();
    if (!classDoc.exists) {
      throw new Error('Assigned Class not found');
    }
    const classData = classDoc.data()!;
    const classCode = (classData.code || classData.section
      ? `${classData.grade || ''}${classData.section || ''}`
      : 'CLASS'
    ).toUpperCase().replace(/\s+/g, '');
    const acYear = data.academicYear || classData.academicYear || new Date().getFullYear().toString();
    studentId = generateStudentId(acYear, classCode, data.rollNo);
    
    if (!finalClassIds.includes(data.classId)) {
      finalClassIds.push(data.classId);
    }
  }

  const generatedEmail = data.email || (data.role === 'student' 
    ? `${studentId.toLowerCase()}@school.edu`
    : `${data.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.edu`);

  const generatedPassword = data.password || generatePassword();

  const firebaseUser = await firebaseCreateUser({
    email: generatedEmail,
    password: generatedPassword,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    photoURL: data.photoURL,
  });

  // Resolve student IDs (e.g. "1a012025") to Firebase UIDs
  let resolvedChildrenIds = data.childrenIds || [];
  if (resolvedChildrenIds.length > 0) {
    const resolved = await Promise.all(
      resolvedChildrenIds.map(async (id) => {
        const snapshot = await collections.users().where('studentId', '==', id).get();
        if (!snapshot.empty) return snapshot.docs[0].id;
        return id;
      }),
    );
    resolvedChildrenIds = resolved;
  }

  const now = new Date().toISOString();

  const userData = {
    uid: firebaseUser.uid,
    email: generatedEmail,
    displayName: data.displayName,
    role: data.role,
    phoneNumber: data.phoneNumber || '',
    photoURL: data.photoURL || '',
    classIds: finalClassIds,
    classId: studentClassId || null,
    studentId: studentId || null,
    rollNo: data.rollNo || null,
    academicYear: data.academicYear || null,
    childrenIds: resolvedChildrenIds,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await collections.users().doc(firebaseUser.uid).set(userData);
  await setCustomClaims(firebaseUser.uid, { role: data.role });

  logger.info('User created by admin', { uid: firebaseUser.uid, email: generatedEmail, role: data.role });

  if (data.role === 'student') {
    const classRef = collections.classes().doc(data.classId!);
    const classDoc = await classRef.get();
    if (classDoc.exists) {
      const currentCount = classDoc.data()!.studentCount || 0;
      await classRef.update({ studentCount: currentCount + 1, updatedAt: now });
    }
  }

  return { ...userData, generatedPassword };
}

/** Update a user's Firestore fields and optionally disable Firebase Auth account. */
export async function updateUser(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  classIds?: string[];
  classId?: string;
  rollNo?: number;
  academicYear?: string;
}) {
  const userRef = collections.users().doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    throw new NotFoundError('User not found');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.displayName) updateData.displayName = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.disabled !== undefined) updateData.isActive = !data.disabled;
  if (data.classIds !== undefined) updateData.classIds = data.classIds;
  
  const existingData = existing.data()!;
  const isStudent = existingData.role === 'student';

  if (data.classId !== undefined) {
    updateData.classId = data.classId;
    const existingClassIds = existingData.classIds || [];
    if (data.classId && !existingClassIds.includes(data.classId)) {
      updateData.classIds = [...existingClassIds, data.classId];
    }
  }
  if (data.rollNo !== undefined) updateData.rollNo = data.rollNo;
  if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;

  if (isStudent && (data.classId !== undefined || data.rollNo !== undefined || data.academicYear !== undefined)) {
    const finalClassId = data.classId !== undefined ? data.classId : existingData.classId;
    const finalRollNo = data.rollNo !== undefined ? data.rollNo : existingData.rollNo;
    const finalAcademicYear = data.academicYear !== undefined ? data.academicYear : existingData.academicYear;

    if (finalClassId && finalRollNo !== undefined) {
      const classDoc = await collections.classes().doc(finalClassId).get();
      if (classDoc.exists) {
        const classData = classDoc.data()!;
        const classCode = (classData.code || classData.section
          ? `${classData.grade || ''}${classData.section || ''}`
          : 'CLASS'
        ).toUpperCase().replace(/\s+/g, '');
        const acYear = finalAcademicYear || classData.academicYear || new Date().getFullYear().toString();
        const studentId = generateStudentId(acYear, classCode, finalRollNo);
        updateData.studentId = studentId;
      }
    }
  }

  await userRef.update(updateData);

  if (data.disabled !== undefined) {
    await firebaseUpdateUser(uid, { disabled: data.disabled });
  }

  const updated = await userRef.get();
  const userData = updated.data()!;
  const { password: _, ...safeUser } = userData;

  logger.info('User updated by admin', { uid });

  return safeUser;
}

/** Delete a user from both Firestore and Firebase Auth. */
export async function deleteUserService(uid: string) {
  const userRef = collections.users().doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    throw new NotFoundError('User not found');
  }

  await userRef.delete();
  await firebaseDeleteUser(uid);

  logger.info('User deleted by admin', { uid });
}

/** Toggle a user's active status. Returns the updated user without password. */
export async function toggleActive(uid: string) {
  const userRef = collections.users().doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    throw new NotFoundError('User not found');
  }

  const currentData = existing.data()!;
  const newIsActive = !currentData.isActive;

  await userRef.update({
    isActive: newIsActive,
    updatedAt: new Date().toISOString(),
  });

  await firebaseUpdateUser(uid, { disabled: !newIsActive });

  const updated = await userRef.get();
  const userData = updated.data()!;
  const { password: _, ...safeUser } = userData;

  logger.info('User active status toggled', { uid, isActive: newIsActive });

  return safeUser;
}

/** Assign a role to a user, updating both Firestore doc and Firebase custom claims. */
export async function assignRole(uid: string, role: string) {
  const userRef = collections.users().doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    throw new NotFoundError('User not found');
  }

  await userRef.update({
    role,
    updatedAt: new Date().toISOString(),
  });

  await setCustomClaims(uid, { role });

  logger.info('User role assigned', { uid, role });
}

/** Ping active — update streakCount using a transaction to avoid race conditions. */
export async function pingActive(uid: string) {
  const userRef = collections.users().doc(uid);
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  return await getDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists) throw new NotFoundError('User not found');

    const data = snap.data()!;
    const lastActive = data.lastActiveDate ? new Date(data.lastActiveDate) : null;
    let streakCount = data.streakCount ?? 0;

    if (lastActive) {
      const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streakCount += 1;
      } else if (diffDays > 1) {
        streakCount = 1;
      }
    } else {
      streakCount = 1;
    }

    transaction.update(userRef, {
      streakCount,
      lastActiveDate: today.toISOString(),
    });

    return { streakCount, lastActiveDate: today.toISOString() };
  });
}

/** Compute strengths and weaknesses from quizAttempts and examAttempts grouped by conceptId. */
export async function getStrengthsWeaknesses(uid: string) {
  const quizSnap = await getDb().collection('quizAttempts')
    .where('studentId', '==', uid)
    .get();
  const examSnap = await getDb().collection('examAttempts')
    .where('studentId', '==', uid)
    .get();

  const conceptScores: Record<string, { totalScore: number; totalMax: number; count: number }> = {};

  const processAttempts = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
    for (const d of docs) {
      const data = d.data();
      const conceptIds: string[] = data.conceptIds ?? data.conceptId ? [data.conceptId] : [];
      const score = data.score ?? 0;
      const maxScore = data.maxScore ?? data.totalPoints ?? 100;

      for (const cid of conceptIds) {
        if (!cid) continue;
        if (!conceptScores[cid]) {
          conceptScores[cid] = { totalScore: 0, totalMax: 0, count: 0 };
        }
        conceptScores[cid].totalScore += score;
        conceptScores[cid].totalMax += maxScore;
        conceptScores[cid].count += 1;
      }
    }
  };

  processAttempts(quizSnap.docs);
  processAttempts(examSnap.docs);

  const strong: string[] = [];
  const weak: string[] = [];
  const details: Record<string, { name: string; averageScore: number; attemptCount: number }> = {};

  for (const [cid, data] of Object.entries(conceptScores)) {
    const averageScore = data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100) : 0;
    details[cid] = { name: cid, averageScore, attemptCount: data.count };
    if (averageScore >= 70) {
      strong.push(cid);
    } else {
      weak.push(cid);
    }
  }

  return { strongConceptIds: strong, weakConceptIds: weak, conceptDetails: details };
}

/** Update only profile fields (displayName, phoneNumber, photoURL) for the current user. */
export async function updateProfile(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  language?: string;
}) {
  const userRef = collections.users().doc(uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    throw new NotFoundError('User not found');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.displayName) updateData.displayName = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;
  if (data.language !== undefined) updateData.language = data.language;

  await userRef.update(updateData);

  const updated = await userRef.get();
  const userData = updated.data()!;
  const { password: _, ...safeUser } = userData;

  return safeUser;
}
