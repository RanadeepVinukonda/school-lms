import { v4 as uuidv4 } from 'uuid';
import { collections, getDb } from '../firebase/firestore';
import { createUser as firebaseCreateUser, updateUser as firebaseUpdateUser, deleteUser as firebaseDeleteUser, getUserById, setCustomClaims } from '../firebase/auth';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

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

/** Create a new user in both Firebase Auth and Firestore. Hashes the password with bcrypt. */
export async function createUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoURL?: string;
  classIds?: string[];
}) {
  const firebaseUser = await firebaseCreateUser({
    email: data.email,
    password: data.password,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    photoURL: data.photoURL,
  });

  const now = new Date().toISOString();

  const userData = {
    uid: firebaseUser.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    phoneNumber: data.phoneNumber || '',
    photoURL: data.photoURL || '',
    classIds: data.classIds || [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await collections.users().doc(firebaseUser.uid).set(userData);

  await setCustomClaims(firebaseUser.uid, { role: data.role });

  logger.info('User created by admin', { uid: firebaseUser.uid, email: data.email, role: data.role });

  return userData;
}

/** Update a user's Firestore fields and optionally disable Firebase Auth account. */
export async function updateUser(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  classIds?: string[];
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

  await userRef.update(updateData);

  const updated = await userRef.get();
  const userData = updated.data()!;
  const { password: _, ...safeUser } = userData;

  return safeUser;
}
