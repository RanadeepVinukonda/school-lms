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
    .min(1, 'Student ID or Email is required')
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
      let loginEmail = data.email;
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@school.edu`;
      }
      const firebaseUser = await loginUser(loginEmail, data.password);
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
        avatar: profileData.avatar as string | undefined,
        firstName: profileData.firstName as string | undefined,
        lastName: profileData.lastName as string | undefined,
        phone: profileData.phone as string | undefined,
        dateOfBirth: profileData.dateOfBirth as string | undefined,
        bio: profileData.bio as string | undefined,
        address: profileData.address as string | undefined,
        classIds: profileData.classIds as string[] | undefined,
        studentId: profileData.studentId as string | undefined,
        teacherId: profileData.teacherId as string | undefined,
        classId: profileData.classId as string | undefined,
        tutorialSeen: profileData.tutorialSeen as boolean | undefined,
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
      <div className="relative min-h-screen flex items-center justify-center px-4">
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
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-8">
            <img
              src="/genesis_icon.png"
              alt="Genesis"
              className="h-24 w-auto object-contain"
            />
          </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <Icon name="error" size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Student ID or Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="e.g. g1a052026 or email"
                  {...register('email')}
                  error={errors.email?.message}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    error={errors.password?.message}
                    className="h-11 pr-10"
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
              <Button
                type="submit"
                className="w-full h-11"
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
              <div className="flex items-center justify-between w-full text-sm">
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
                <Link to={ROUTES.REGISTER} className="text-muted-foreground hover:text-foreground transition-colors">
                  Create account
                </Link>
              </div>
            </form>
        </motion.div>
      </div>
    </>
  );
}
