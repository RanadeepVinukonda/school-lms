import { supabase } from '../supabase/config';
import type { UserProfile, UserRole } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !session) throw new Error(signInError?.message || 'Login failed');
    const token = session.access_token;
    const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    if (!profile) throw new Error('User profile not found');
    const p = profile as Record<string, unknown>;
    return {
      user: {
        id: p.id as string, email: (p.email as string) || session.user.email || '',
        displayName: (p.display_name as string) || session.user.email?.split('@')[0] || 'User',
        role: (p.role as UserRole) || 'student', isActive: (p.is_active as boolean) ?? true,
        avatar: p.photo_url as string | undefined, firstName: p.first_name as string | undefined,
        lastName: p.last_name as string | undefined, phone: p.phone as string | undefined,
        dateOfBirth: p.date_of_birth as string | undefined, bio: p.bio as string | undefined,
        address: p.address as string | undefined, classIds: p.class_ids as string[] | undefined,
        studentId: p.student_id as string | undefined, teacherId: p.teacher_id as string | undefined,
        classId: p.class_id as string | undefined, tutorialSeen: p.tutorial_seen as boolean | undefined,
        createdAt: (p.created_at as string) || new Date().toISOString(),
        updatedAt: (p.updated_at as string) || new Date().toISOString(),
      }, token,
    };
  },
  async logout(): Promise<void> { await supabase.auth.signOut(); },
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
    if (!profile) return null;
    const p = profile as Record<string, unknown>;
    return {
      id: p.id as string, email: (p.email as string) || session.user.email || '',
      displayName: (p.display_name as string) || '', role: (p.role as UserRole) || 'student',
      isActive: (p.is_active as boolean) ?? true, avatar: p.photo_url as string | undefined,
      firstName: p.first_name as string | undefined, lastName: p.last_name as string | undefined,
      phone: p.phone as string | undefined, dateOfBirth: p.date_of_birth as string | undefined,
      bio: p.bio as string | undefined, address: p.address as string | undefined,
      classIds: p.class_ids as string[] | undefined, studentId: p.student_id as string | undefined,
      teacherId: p.teacher_id as string | undefined, classId: p.class_id as string | undefined,
      tutorialSeen: p.tutorial_seen as boolean | undefined,
      createdAt: (p.created_at as string) || new Date().toISOString(),
      updatedAt: (p.updated_at as string) || new Date().toISOString(),
    };
  },
  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  },
};
