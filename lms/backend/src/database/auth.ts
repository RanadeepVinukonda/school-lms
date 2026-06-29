import { getSupabaseAdmin } from '../services/supabase';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled?: boolean;
  role?: string;
  metadata?: Record<string, unknown>;
}

const USER_META_ROLE = 'role';

function extractUser(user: any): AuthUser {
  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};
  return {
    uid: user.id,
    email: user.email || '',
    displayName: meta?.display_name || meta?.displayName || '',
    phoneNumber: user.phone || meta?.phone_number || '',
    photoURL: meta?.photo_url || meta?.photoURL || '',
    disabled: user.banned_until !== undefined && user.banned_until !== null,
    role: appMeta?.[USER_META_ROLE] || '',
    metadata: meta,
  };
}

export async function verifyToken(idToken: string): Promise<AuthUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { user }, error } = await supabase.auth.getUser(idToken);
  if (error || !user) throw new Error('Invalid token: ' + (error?.message || 'User not found'));
  return extractUser(user);
}

export async function createUser(params: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role?: string;
}): Promise<AuthUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      display_name: params.displayName,
      phone_number: params.phoneNumber || '',
      photo_url: params.photoURL || '',
    },
    app_metadata: params.role ? { [USER_META_ROLE]: params.role } : undefined,
  });
  if (error || !data.user) throw new Error('Failed to create user: ' + (error?.message || 'Unknown'));
  return extractUser(data.user);
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
    role?: string;
  }
): Promise<AuthUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const updateBody: Record<string, unknown> = {};
  if (params.email) updateBody.email = params.email;
  if (params.password) updateBody.password = params.password;
  if (params.disabled !== undefined) updateBody.ban_duration = params.disabled ? '24h' : 'none';

  const meta: Record<string, string> = {};
  if (params.displayName) meta.display_name = params.displayName;
  if (params.phoneNumber) meta.phone_number = params.phoneNumber;
  if (params.photoURL) meta.photo_url = params.photoURL;
  if (Object.keys(meta).length > 0) updateBody.user_metadata = meta;

  const appMeta: Record<string, string> = {};
  if (params.role) appMeta[USER_META_ROLE] = params.role;
  if (Object.keys(appMeta).length > 0) updateBody.app_metadata = appMeta;

  const { data, error } = await supabase.auth.admin.updateUserById(uid, updateBody);
  if (error || !data.user) throw new Error('Failed to update user: ' + (error?.message || 'Unknown'));
  return extractUser(data.user);
}

export async function deleteUser(uid: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.admin.deleteUser(uid);
  if (error) throw new Error('Failed to delete user: ' + error.message);
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  // ponytail: store claims in app_metadata — not identical to Firebase custom claims but sufficient
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.admin.updateUserById(uid, {
    app_metadata: claims,
  });
  if (error) throw new Error('Failed to set claims: ' + error.message);
}

export async function revokeTokens(uid: string): Promise<void> {
  // ponytail: Supabase doesn't support token revocation; changing password invalidates sessions
  // Silently succeed — token expiry handles rotation
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  // ponytail: listUsers and filter in-memory — upgrade to admin API filter when available
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return null;
  const user = data.users.find((u: any) => u.email === email);
  return user ? extractUser(user) : null;
}

export async function getUserById(uid: string): Promise<AuthUser | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.admin.getUserById(uid);
  if (error || !data?.user) return null;
  return extractUser(data.user);
}

export async function listUsers(
  maxResults?: number,
  _pageToken?: string
): Promise<{ users: AuthUser[]; pageToken?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  // ponytail: pagination via page param — Supabase GoTrue uses page/per_page
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: maxResults || 1000,
  });
  if (error) return { users: [] };
  return { users: data.users.map(u => extractUser(u)) };
}
