import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { mockUsers } from '@/lib/mockData';

const teacherLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type TeacherLoginFormData = z.infer<typeof teacherLoginSchema>;

const teachers = [mockUsers.teacher1, mockUsers.teacher2];

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeacherLoginFormData>({
    resolver: zodResolver(teacherLoginSchema),
    defaultValues: {
      email: '',
      teacherId: '',
      password: '',
    },
  });

  async function onSubmit(data: TeacherLoginFormData) {
    setError('');
    try {
      const mockProfile = teachers.find(
        (t) => t.email === data.email && t.teacherId === data.teacherId
      );
      if (!mockProfile) {
        setError('Invalid email or Teacher ID');
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idTokenResult = await cred.user.getIdTokenResult();
      const role = (idTokenResult.claims.role as string) || 'teacher';
      if (role !== 'teacher' && role !== 'admin') {
        setError('This account is not a teacher account');
        return;
      }
      setUser({
        id: cred.user.uid,
        email: cred.user.email || data.email,
        displayName: cred.user.displayName || mockProfile.displayName,
        role: role as 'teacher' | 'admin',
        isActive: true,
        avatar: cred.user.photoURL || undefined,
        createdAt: cred.user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Welcome back!');
      navigate(ROUTES.TEACHER_DASHBOARD);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Invalid email or password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
      };
      setError(errorMessages[firebaseErr.code || ''] || firebaseErr.message || 'Login failed');
    }
  }

  return (
    <>
      <SEOHead
        title="Teacher Sign In"
        description="Sign in to your Genesis teacher account."
      />

      <motion.div
        className="flex min-h-[80vh] items-center justify-center px-4 py-12"
        initial="initial"
        animate="animate"
        variants={pageTransition}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-2 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
                <Icon name="badge" size={28} className="text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Teacher Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your teacher portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@example.com"
                  {...register('email')}
                  error={errors.email?.message}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacherId">Teacher ID</Label>
                <Input
                  id="teacherId"
                  type="text"
                  placeholder="e.g. TCH001"
                  {...register('teacherId')}
                  error={errors.teacherId?.message}
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    error={errors.password?.message}
                    disabled={isSubmitting}
                    autoComplete="current-password"
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
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              <Link to={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
                Choose a different role
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </>
  );
}
