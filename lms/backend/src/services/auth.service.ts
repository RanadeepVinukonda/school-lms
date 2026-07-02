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
    if (data.role === 'parent' && existingUser.role === 'teacher') {
      // Teacher can also register as parent — keep role as teacher, return success
      logger.info('Teacher re-registered as parent', { uid: existingUser.uid, email: data.email });
      return { uid: existingUser.uid, email: data.email, displayName: data.displayName, role: existingUser.role };
    }
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

/** Send password reset email via Supabase Admin REST API. */
export async function forgotPassword(email: string) {
  const redirectTo = `${env.FRONTEND_URL}/reset-password`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: email.toLowerCase(), redirect_to: redirectTo }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('Failed to send password reset email', { email, status: res.status, body });
    if (res.status === 429) {
      throw new Error('Too many requests. Please wait at least 60 seconds and try again.');
    }
    throw new Error('Failed to send reset email. Please try again later.');
  }

  logger.info('Password reset email sent via Supabase', { email });
  return { message: 'If the email exists, a reset link has been sent' };
}

/** Reset password using a Supabase access token (from recovery hash). */
export async function resetWithToken(accessToken: string, newPassword: string) {
  // Get user info from the access token
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    apikey: env.SUPABASE_ANON_KEY,
  };

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) {
    const body = await userRes.text();
    logger.error('Invalid or expired access token', { status: userRes.status, body });
    throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');
  }

  const userData = await userRes.json() as { id?: string };
  const uid = userData.id;
  if (!uid) {
    throw new UnauthorizedError('Invalid or expired reset link. Please request a new one.');
  }

  await resetPassword(uid, newPassword);
}

/** Reset a password using Supabase Admin REST API (bypasses client rate limits). */
export async function resetPassword(uid: string, newPassword: string) {
  const response = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${uid}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to reset password', { uid, status: response.status, body });
    throw new Error('Failed to reset password');
  }

  logger.info('Password reset completed via Supabase Admin', { uid });
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
