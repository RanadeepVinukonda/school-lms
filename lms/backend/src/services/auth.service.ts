import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { createUser as firebaseCreateUser, getUserByEmail, getUserById, deleteUser as firebaseDeleteUser, setCustomClaims } from '../firebase/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function register(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  phoneNumber?: string;
  photoURL?: string;
}) {
  const existingUser = await getUserByEmail(data.email);
  if (existingUser) {
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

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const userData = {
    uid: firebaseUser.uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    phoneNumber: data.phoneNumber || '',
    photoURL: data.photoURL || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: hashedPassword,
  };

  await collections.users().doc(firebaseUser.uid).set(userData);

  logger.info('User registered', { uid: firebaseUser.uid, email: data.email, role: data.role });

  const { password: _, ...safeUser } = userData;
  return safeUser;
}

export async function login(email: string, password: string) {
  const usersSnapshot = await collections.users().where('email', '==', email.toLowerCase()).limit(1).get();
  if (usersSnapshot.empty) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();
  if (!userData.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }
  const isValidPassword = await bcrypt.compare(password, userData.password || '');
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  logger.info('User logged in', { uid: userDoc.id, email });

  const { password: _, ...safeUser } = userData;
  return {
    user: safeUser,
    uid: userDoc.id,
  };
}

export async function verifyUserToken(uid: string) {
  const user = await getUserById(uid);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User profile not found');
  }

  const userData = userDoc.data()!;
  const { password: _, ...safeUser } = userData;
  return safeUser;
}

export async function forgotPassword(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const resetToken = uuidv4();
  const hashedToken = await bcrypt.hash(resetToken, 10);

  await collections.tokens().doc(user.uid).set({
    type: 'password_reset',
    token: hashedToken,
    email: email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    used: false,
  });

  logger.info('Password reset token generated', { uid: user.uid, email });

  return {
    message: 'If the email exists, a reset link has been sent',
    resetToken: resetToken,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokensSnapshot = await collections.tokens()
    .where('type', '==', 'password_reset')
    .where('used', '==', false)
    .get();

  let matchedToken: FirebaseFirestore.DocumentData | null = null;
  let matchedDocId = '';

  for (const doc of tokensSnapshot.docs) {
    const data = doc.data();
    const isValid = await bcrypt.compare(token, data.token);
    if (isValid) {
      matchedToken = data;
      matchedDocId = doc.id;
      break;
    }
  }

  if (!matchedToken) {
    throw new ValidationError('Invalid or expired reset token');
  }

  if (new Date(matchedToken.expiresAt) < new Date()) {
    await collections.tokens().doc(matchedDocId).update({ used: true });
    throw new ValidationError('Reset token has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await collections.users().doc(matchedDocId).update({
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
  });

  await collections.tokens().doc(matchedDocId).update({ used: true });

  logger.info('Password reset completed', { uid: matchedDocId });
}

export async function changePassword(uid: string, currentPassword: string, newPassword: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const userData = userDoc.data()!;
  const isValid = await bcrypt.compare(currentPassword, userData.password);
  if (!isValid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await collections.users().doc(uid).update({
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
  });

  logger.info('Password changed', { uid });
}

export async function getUserProfile(uid: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const userData = userDoc.data()!;
  const { password: _, ...safeUser } = userData;
  return safeUser;
}

export async function updateUserProfile(uid: string, data: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
}) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.displayName) updateData.displayName = data.displayName;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
  if (data.photoURL !== undefined) updateData.photoURL = data.photoURL;

  await collections.users().doc(uid).update(updateData);

  const updated = await collections.users().doc(uid).get();
  const userData = updated.data()!;
  const { password: _, ...safeUser } = userData;

  logger.info('User profile updated', { uid });

  return safeUser;
}
