import { supabase } from '../supabase/config';
import type { UserProfile, UserRole } from '../types';

/** Cache current session to avoid repeated auth.getSession() calls on cold start. */
let cachedSession: { access_token: string; refresh_token?: string } | null = null;

function mapProfile(session: { user?: { id: string; email?: string } }, profile: Record<string, unknown>): UserProfile {
  return {
    id: profile.id as string,
    email: (profile.email as string) || session.user?.email || '',
    displayName: (profile.display_name as string) || session.user?.email?.split('@')[0] || 'User',
    role: (profile.role as UserRole) || 'student',
    isActive: (profile.is_active as boolean) ?? true,
    avatar: profile.photo_url as string | undefined,
    firstName: profile.first_name as string | undefined,
    lastName: profile.last_name as string | undefined,
    phone: profile.phone as string | undefined,
    dateOfBirth: profile.date_of_birth as string | undefined,
    bio: profile.bio as string | undefined,
    address: profile.address as string | undefined,
    classIds: profile.class_ids as string[] | undefined,
    studentId: profile.student_id as string | undefined,
    teacherId: profile.teacher_id as string | undefined,
    classId: profile.class_id as string | undefined,
    tutorialSeen: profile.tutorial_seen as boolean | undefined,
    createdAt: (profile.created_at as string) || new Date().toISOString(),
    updatedAt: (profile.updated_at as string) || new Date().toISOString(),
  };
}

export const authService = {
  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !session) throw new Error(signInError?.message || 'Login failed');
    
    cachedSession = { access_token: session.access_token, refresh_token: session.refresh_token };
    const token = session.access_token;
    
    const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    if (!profile) throw new Error('User profile not found');
    
    return { user: mapProfile(session, profile as Record<string, unknown>), token };
  },

  async logout(): Promise<void> {
    cachedSession = null;
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    // Try cached session first to avoid repeated auth.getSession() calls
    if (cachedSession?.access_token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(cachedSession.access_token);
        if (user) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
          if (profile) return mapProfile({ user }, profile as Record<string, unknown>);
        }
      } catch {
        // Cached session expired — fall through to standard getSession()
        cachedSession = null;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    cachedSession = { access_token: session.access_token, refresh_token: session.refresh_token };
    
    const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    if (!profile) return null;
    
    return mapProfile(session, profile as Record<string, unknown>);
  },

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  },
};
