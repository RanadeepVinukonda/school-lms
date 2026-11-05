import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
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
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/features/auth/schemas/authSchemas';
import { ROUTES } from '@/lib/constants';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) =>
      authService.forgotPassword(data.email),
    onSuccess: () => {
      toast.success('Password reset email sent. Check your inbox.');
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error: Error) => {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        toast.error('Too many requests. Please wait a minute before trying again.');
      } else {
        toast.error(msg || 'Failed to send reset email');
      }
    },
  });

  function onSubmit(data: ForgotPasswordFormData) {
    mutation.mutate(data);
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Forgot password?</CardTitle>
        <CardDescription className="text-center">
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isSuccess ? (
          <div className="flex flex-col items-center py-4 text-center space-y-3">
            <div className="rounded-full bg-success/10 p-3">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              Check your email for the password reset link. It may take a few minutes to arrive.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                error={errors.email?.message}
                disabled={mutation.isPending || cooldown > 0}
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mutation.isPending || cooldown > 0}
              loading={mutation.isPending}
            >
              {cooldown > 0 ? `Retry in ${cooldown}s` : mutation.isPending ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          to={ROUTES.LOGIN}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}