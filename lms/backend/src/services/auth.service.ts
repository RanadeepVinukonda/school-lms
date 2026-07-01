import { v4 as uuidv4 } from 'uuid';
import { collections } from '../database/adapter';
import { createUser as firebaseCreateUser, getUserByEmail, getUserById, setCustomClaims, updateUser as firebaseUpdateUser } from '../database/auth';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/** Register a new user in both Firebase Auth and Firestore. Sets custom claims with the user's role. */
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
  };

  await collections.users().doc(firebaseUser.uid).set(userData);

  logger.info('User registered', { uid: firebaseUser.uid, email: data.email, role: data.role });

  return userData;
}

/** Authenticate a user by email and password using Supabase Auth REST API. */
export async function login(email: string, password: string) {
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

  const data = (await response.json()) as { user?: { id: string }; access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!response.ok) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const uid = data.user?.id;
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new UnauthorizedError('User not found');
  }

  const userData = userDoc.data()!;
  if (!userData.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  logger.info('User logged in', { uid, email });

  return {
    user: userData,
    uid,
    token: data.access_token,
  };
}

/** Verify a user's token by uid. Returns user profile. */
export async function verifyUserToken(uid: string) {
  const user = await getUserById(uid);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User profile not found');
  }

  return userDoc.data()!;
}

/** Generate a password reset token. Always returns the same message to avoid email enumeration. */
export async function forgotPassword(email: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const resetToken = uuidv4();

  await collections.tokens().doc(user.uid).set({
    type: 'password_reset',
    token: resetToken,
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

/** Reset a password using a valid, non-expired reset token. Uses Firebase Auth Admin SDK. */
export async function resetPassword(token: string, newPassword: string) {
  const tokensSnapshot = await collections.tokens()
    .where('type', '==', 'password_reset')
    .where('used', '==', false)
    .get();

  let matchedToken: FirebaseFirestore.DocumentData | null = null;
  let matchedDocId = '';

  for (const doc of tokensSnapshot.docs) {
    const data = doc.data();
    if (data.token === token) {
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

  await firebaseUpdateUser(matchedDocId, { password: newPassword });

  await collections.tokens().doc(matchedDocId).update({ used: true });

  logger.info('Password reset completed', { uid: matchedDocId });
}

/** Change a user's password using Supabase Auth. Verifies current password via REST API, updates via Admin API. */
export async function changePassword(uid: string, currentPassword: string, newPassword: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }
  const userData = userDoc.data()!;
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: userData.email, password: currentPassword }),
    }
  );

  if (!response.ok) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  await firebaseUpdateUser(uid, { password: newPassword });

  logger.info('Password changed', { uid });
}

/** Fetch user profile by uid. */
export async function getUserProfile(uid: string) {
  const userDoc = await collections.users().doc(uid).get();
  if (!userDoc.exists) {
    throw new NotFoundError('User not found');
  }

  return userDoc.data()!;
}

/** Update a user's own profile fields (displayName, phoneNumber, photoURL). */
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

  logger.info('User profile updated', { uid });

  return updated.data()!;
}
