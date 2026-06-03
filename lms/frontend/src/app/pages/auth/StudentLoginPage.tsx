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

const studentLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  studentId: z.string().min(1, 'Student ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type StudentLoginFormData = z.infer<typeof studentLoginSchema>;

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormData>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: {
      email: '',
      studentId: '',
      password: '',
    },
  });

  function onSubmit(data: StudentLoginFormData) {
    // Mock auth — sets store and navigates
    setUser({
      id: 'student-1',
      email: data.email,
      displayName: 'Student User',
      firstName: 'Student',
      lastName: 'User',
      role: 'student',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    navigate(ROUTES.STUDENT_DASHBOARD);
  }

  return (
    <>
      <SEOHead
        title="Student Sign In"
        description="Sign in to your Genesis student account."
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
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10">
                <Icon name="school" size={28} className="text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Student Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your student portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  {...register('email')}
                  error={errors.email?.message}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  type="text"
                  placeholder="e.g. STU-2024-001"
                  {...register('studentId')}
                  error={errors.studentId?.message}
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
