import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { collections } from '../firebase/firestore';
import { createUser as firebaseCreateUser, updateUser as firebaseUpdateUser, deleteUser as firebaseDeleteUser, getUserById } from '../firebase/auth';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

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

  baseQuery = baseQuery.orderBy('createdAt', 'desc');

  const countSnapshot = await baseQuery.count().get();
  const total = countSnapshot.data().count;

  const offset = (page - 1) * limit;
  const snapshot = await baseQuery.offset(offset).limit(limit).get();

  let items = snapshot.docs.map((doc) => {
    const data = doc.data();
    const { password, ...safeData } = data;
    return { id: doc.id, ...safeData };
  });

  if (query.search) {
    const search = query.search.toLowerCase();
    items = items.filter(
      (item: any) =>
        item.displayName?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search)
    );
  }

  if (query.classId) {
    items = items.filter((item: any) =>
      item.classIds?.includes(query.classId)
    );
  }

  return { items, total, page, limit };
}

export async function getUserByIdService(uid: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const data = userDoc.data()!;
  const { password, ...safeData } = data;
  return { ...safeData };
}

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

  const hashedPassword = await bcrypt.hash(data.password, 12);
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
    password: hashedPassword,
  };

  await collections.users().doc(firebaseUser.uid).set(userData);

  logger.info('User created by admin', { uid: firebaseUser.uid, email: data.email, role: data.role });

  const { password: _, ...safeUser } = userData;
  return safeUser;
}

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

  const { setCustomClaims } = await import('../firebase/auth');
  await setCustomClaims(uid, { role });

  logger.info('User role assigned', { uid, role });
}

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


