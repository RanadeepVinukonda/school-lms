import { getSupabaseAdmin } from '../services/supabase';
import { ValidationError } from '../utils/errors';

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

async function retryOnRateLimit<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('429');
      if (!isRateLimit || attempt === maxRetries - 1) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function createUser(params: {
  phone?: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  password?: string;
  email?: string;
}): Promise<AuthUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  const placeholderEmail = params.email
    || `${params.displayName.replace(/\s+/g, '').toLowerCase()}@school.edu`;

  const createPayload: Record<string, unknown> = {
    email: placeholderEmail,
    email_confirm: true,
    user_metadata: {
      display_name: params.displayName,
      phone_number: params.phone || '',
      photo_url: params.photoURL || '',
    },
  };
  if (params.role) createPayload.app_metadata = { [USER_META_ROLE]: params.role };
  if (params.phone) createPayload.phone = params.phone;
  if (params.password) createPayload.password = params.password;

  const { data, error } = await retryOnRateLimit(() => supabase.auth.admin.createUser(createPayload));
  if (error || !data.user) throw new ValidationError('Failed to create user: ' + (error?.message || 'Unknown'));
  return extractUser(data.user);
}

export async function updateUser(
  uid: string,
  params: {
    phone?: string;
    email?: string;
    password?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
    role?: string;
  }
): Promise<AuthUser> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const updateBody: Record<string, unknown> = {};
  if (params.disabled !== undefined) updateBody.ban_duration = params.disabled ? '24h' : 'none';
  if (params.email) {
    updateBody.email = params.email;
    // Keep the email confirmed — otherwise GoTrue clears email_confirmed_at
    // on confirmation-enforced projects and the user can't sign in again
    // (this mirrors how createUser creates accounts with email_confirm: true).
    updateBody.email_confirm = true;
  }
  if (params.password) updateBody.password = params.password;

  const meta: Record<string, string> = {};
  if (params.displayName) meta.display_name = params.displayName;
  if (params.phone) meta.phone_number = params.phone;
  if (params.photoURL) meta.photo_url = params.photoURL;
  if (Object.keys(meta).length > 0) updateBody.user_metadata = meta;

  const appMeta: Record<string, string> = {};
  if (params.role) appMeta[USER_META_ROLE] = params.role;
  if (Object.keys(appMeta).length > 0) updateBody.app_metadata = appMeta;

  const { data, error } = await retryOnRateLimit(() => supabase.auth.admin.updateUserById(uid, updateBody));
  if (error || !data.user) throw new Error('Failed to update user: ' + (error?.message || 'Unknown'));
  return extractUser(data.user);
}

export async function deleteUser(uid: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await retryOnRateLimit(() => supabase.auth.admin.deleteUser(uid));
  if (error) throw new Error('Failed to delete user: ' + error.message);
}

export async function getUserByPhone(phone: string): Promise<AuthUser | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { data: dbUser } = await supabase.from('users').select('id, email, display_name, role, phone_number, photo_url, is_active').eq('phone_number', phone).maybeSingle();
  if (!dbUser) return null;
  return {
    uid: dbUser.id,
    email: dbUser.email || '',
    displayName: dbUser.display_name || '',
    role: dbUser.role || '',
    phoneNumber: dbUser.phone_number || '',
    photoURL: dbUser.photo_url || '',
    disabled: dbUser.is_active === false,
  };
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await retryOnRateLimit(() => supabase.auth.admin.updateUserById(uid, {
    app_metadata: claims,
  }));
  if (error) throw new Error('Failed to set claims: ' + error.message);
}

export async function revokeTokens(uid: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.admin.signOut(uid);
  if (error) throw new Error('Failed to revoke tokens: ' + error.message);
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
  const { data, error } = await retryOnRateLimit(() => supabase.auth.admin.listUsers({
    page: 1,
    perPage: maxResults || 1000,
  }));
  if (error) return { users: [] };
  return { users: data.users.map(u => extractUser(u)) };
}

export class SupabaseAuthProvider {
  async verifyToken(idToken: string): Promise<any> {
    const user = await verifyToken(idToken);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  async createUser(properties: { phone: string; email?: string; displayName?: string; photoURL?: string }): Promise<any> {
    const user = await createUser({
      phone: properties.phone,
      displayName: properties.displayName || '',
    });
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  async getUser(uid: string): Promise<any> {
    const user = await getUserById(uid);
    if (!user) throw new Error('User not found');
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  async deleteUser(uid: string): Promise<void> {
    await deleteUser(uid);
  }
}

