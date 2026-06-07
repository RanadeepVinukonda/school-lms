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
import { loginUser } from '@/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { cn } from '@/lib/utils';

const teacherLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

type TeacherLoginFormData = z.infer<typeof teacherLoginSchema>;

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherLoginFormData>({
    resolver: zodResolver(teacherLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: TeacherLoginFormData) {
    setError('');
    try {
      const firebaseUser = await loginUser(data.email, data.password);
      const docRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setError('User profile not found. Please contact your administrator.');
        return;
      }
      const profileData = snap.data() as Record<string, unknown>;
      const role = profileData.role as string;

      setUser({
        id: snap.id,
        email: (profileData.email as string) || firebaseUser.email || '',
        displayName: (profileData.displayName as string) || firebaseUser.displayName || '',
        role: role as any,
        isActive: profileData.isActive as boolean ?? true,
        createdAt: (profileData.createdAt as string) || new Date().toISOString(),
        updatedAt: (profileData.updatedAt as string) || new Date().toISOString(),
      });

      if (role === 'admin' || role === 'super_admin') {
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else if (role === 'teacher') {
        navigate(ROUTES.TEACHER_DASHBOARD);
      } else if (role === 'student') {
        navigate(ROUTES.STUDENT_DASHBOARD);
      } else {
        setError('Unrecognized account role.');
      }
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
      <SEOHead title="Teacher Sign In" description="Sign in to your Genesis teacher account." />
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-primary/[0.03] to-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-tertiary/10 blur-3xl" />
        </div>

        <motion.button
          onClick={() => navigate('/welcome')}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Icon name="arrow_back" size={18} />
          Back
        </motion.button>

        <motion.div
          initial="initial"
          animate="animate"
          variants={pageTransition}
          className="relative z-10 w-full max-w-md"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
              <img
                src="/genesis_icon.png"
                alt="Genesis"
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>

          <Card className={cn(
            'border-0 shadow-2xl shadow-primary/5 backdrop-blur-sm',
            'bg-surface/95',
          )}>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">
                <span className="text-primary">Sign In</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
                  >
                    <Icon name="error" size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    {...register('email')}
                    error={errors.email?.message}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...register('password')}
                      error={errors.password?.message}
                      className="h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm text-primary font-medium hover:underline underline-offset-4 text-center pt-1">
                  Forgot password?
                </Link>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
