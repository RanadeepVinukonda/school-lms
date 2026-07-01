import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { z } from 'zod';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { supabase } from '@/supabase/config';
import { cardStackReveal } from '@/lib/motion';

const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: AdminLoginFormData) {
    setError('');
    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError || !authData.user) throw signInError || new Error('Login failed');
      setToken(authData.session?.access_token || '');
      const { data: profileData } = await supabase.from('users').select('*').eq('id', authData.user.id).maybeSingle();
      if (!profileData) {
        setError('User profile not found. Please contact your administrator.');
        return;
      }
      if (profileData.role !== 'admin' && profileData.role !== 'super_admin') {
        setError('This account is not an admin account. Please use the correct login page.');
        return;
      }
      setUser({
        id: profileData.id,
        email: profileData.email || authData.user.email || '',
        displayName: profileData.display_name || '',
        role: profileData.role as 'admin' | 'super_admin',
        isActive: profileData.is_active ?? true,
        createdAt: profileData.created_at || new Date().toISOString(),
        updatedAt: profileData.updated_at || new Date().toISOString(),
      });
      navigate(ROUTES.ADMIN_DASHBOARD);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    }
  }

  return (
    <>
      <SEOHead title="Admin Sign In" description="Sign in to your Genesis admin portal." />
      <motion.div
        className="flex min-h-[80vh] items-center justify-center px-4 py-12"
        initial="initial"
        animate="animate"
        variants={pageTransition}
      >
        <motion.div variants={cardStackReveal} custom={0} className="w-full max-w-md">
          <Card className="w-full border-border/60">
            <CardHeader className="space-y-1 text-center">
              <div className="mb-2 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/10">
                  <Icon name="manage_accounts" size={28} className="text-purple-500" />
                </div>
              </div>
              <CardTitle className="text-headline-sm">Admin Sign In</CardTitle>
              <CardDescription>Authorized personnel only</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 sm:p-5 p-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <Icon name="error" size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="admin@genesis.edu" {...register('email')} error={errors.email?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...register('password')}
                      error={errors.password?.message}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary hover:underline">Forgot password?</Link>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
