import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/features/auth/schemas/authSchemas';
import { ROUTES } from '@/lib/constants';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { supabase } from '@/supabase/config';
import { toast } from 'sonner';

export default function ResetPasswordForm() {
  const [recoveryState, setRecoveryState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [uid, setUid] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        setUid(session.user.id);
        setRecoveryState('valid');
        return;
      }
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
          setUid(session.user.id);
          setRecoveryState('valid');
          subscription?.unsubscribe();
        }
      });
      subscription = data.subscription;
      setTimeout(() => {
        if (cancelled) return;
        setRecoveryState((s) => (s === 'loading' ? 'invalid' : s));
        subscription?.unsubscribe();
      }, 15000);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      if (!uid) throw new Error('Session expired. Please request a new reset link.');
      await authService.resetPassword(uid, data.password);
    },
    onSuccess: () => {
      toast.success('Password has been reset successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  function onSubmit(data: ResetPasswordFormData) {
    mutation.mutate(data);
  }

  if (recoveryState === 'loading') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Checking reset link...</CardTitle>
          <CardDescription className="text-center">
            Please wait while we verify your reset link.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (recoveryState === 'invalid') {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Invalid Reset Link</CardTitle>
          <CardDescription className="text-center">
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (mutation.isSuccess) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col items-center py-4 text-center space-y-3">
            <div className="rounded-full bg-success/10 p-3">
              <ShieldCheck className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Password reset successful</CardTitle>
            <CardDescription>
              Your password has been updated successfully.
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={ROUTES.LOGIN}>Sign in with new password</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Reset password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                {...register('password')}
                error={errors.password?.message}
                disabled={mutation.isPending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
                disabled={mutation.isPending}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={mutation.isPending}
            loading={mutation.isPending}
          >
            {mutation.isPending ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          to={ROUTES.LOGIN}
          className="text-sm text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}