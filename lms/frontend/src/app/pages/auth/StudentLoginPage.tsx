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

const studentLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: StudentLoginFormData) {
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
      <SEOHead title="Student Sign In" description="Sign in to your Genesis student account." />
      <motion.div className="relative flex min-h-screen items-center justify-center px-4 py-12" initial="initial" animate="animate" variants={pageTransition}>
        <button
          onClick={() => navigate('/welcome')}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name="arrow_back" size={18} />
          Back to Home
        </button>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img
                src="/genesis_icon.png"
                alt="Genesis"
                className="h-16 w-auto object-contain mx-auto"
              />
            </div>
            <CardTitle className="text-2xl">Student Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your student portal</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <Icon name="error" size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" {...register('email')} error={errors.email?.message} />
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
              <div className="flex items-center justify-between w-full text-sm">
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-primary hover:underline">Forgot password?</Link>
                <Link to={ROUTES.REGISTER} className="text-primary hover:underline">Create account</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </>
  );
}
