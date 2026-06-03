import { admin, getAdminAuth } from './admin';

export async function verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken, true);
  return decoded;
}

export async function createUser(params: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<admin.auth.UserRecord> {
  const auth = getAdminAuth();
  const user = await auth.createUser({
    email: params.email,
    password: params.password,
    displayName: params.displayName,
    phoneNumber: params.phoneNumber,
    photoURL: params.photoURL,
  });
  return user;
}

export async function updateUser(
  uid: string,
  params: {
    email?: string;
    password?: string;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    disabled?: boolean;
  }
): Promise<admin.auth.UserRecord> {
  const auth = getAdminAuth();
  const user = await auth.updateUser(uid, params);
  return user;
}

export async function deleteUser(uid: string): Promise<void> {
  const auth = getAdminAuth();
  await auth.deleteUser(uid);
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  const auth = getAdminAuth();
  await auth.setCustomUserClaims(uid, claims);
}

export async function revokeTokens(uid: string): Promise<void> {
  const auth = getAdminAuth();
  await auth.revokeRefreshTokens(uid);
}

export async function getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
  const auth = getAdminAuth();
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch {
    return null;
  }
}

export async function getUserById(uid: string): Promise<admin.auth.UserRecord | null> {
  const auth = getAdminAuth();
  try {
    const user = await auth.getUser(uid);
    return user;
  } catch {
    return null;
  }
}

export async function listUsers(
  maxResults?: number,
  pageToken?: string
): Promise<admin.auth.ListUsersResult> {
  const auth = getAdminAuth();
  const result = await auth.listUsers(maxResults, pageToken);
  return result;
}
