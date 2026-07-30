import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SEOHead } from '@/components/common/SEOHead';
import { useLogin } from '@/features/auth/hooks/useLogin';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onLogin(data: LoginForm) {
    loginMutation.mutate(data);
  }

  return (
    <>
      <SEOHead title="Sign In" description="Sign in to your account" canonical="/login" />
      <Card className="w-full border-border/60 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-headline-sm text-center font-bold">Sign in</CardTitle>
          <CardDescription className="text-center text-body-md text-muted-foreground">
            Sign in with your email and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onLogin)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-title-sm font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                {...register('email')}
                disabled={loginMutation.isPending}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-label-sm text-error">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-title-sm font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={loginMutation.isPending}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-label-sm text-error">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
