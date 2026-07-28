import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/common/SEOHead';
import { useLogin, useVerifyOtp } from '@/features/auth/hooks/useLogin';
import { ROUTES } from '@/lib/constants';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [otpStep, setOtpStep] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();

  const loginForm = useForm({ defaultValues: { email: '', password: '', rememberMe: false } });
  const phoneForm = useForm<{ phone: string }>({ defaultValues: { phone: '' } });
  const otpForm = useForm<{ token: string }>({ defaultValues: { token: '' } });

  async function onEmailLogin(data: { email: string; password: string; rememberMe?: boolean }) {
    loginMutation.mutate({ email: data.email, password: data.password, rememberMe: data.rememberMe });
  }

  async function onSendOtp(data: { phone: string }) {
    loginMutation.mutate({ phone: data.phone }, {
      onSuccess: (result) => {
        if (result && 'otpSent' in result) {
          setOtpPhone(data.phone);
          setOtpStep('verify');
        }
      },
    });
  }

  async function onVerifyOtp(data: { token: string }) {
    verifyOtpMutation.mutate({ phone: otpPhone, token: data.token });
  }

  if (otpStep === 'verify') {
    return (
      <>
        <SEOHead title="Verify OTP" description="Enter the OTP sent to your phone" />
        <Card className="w-full border-border/60 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-headline-sm text-center font-bold">Verify OTP</CardTitle>
            <CardDescription className="text-center text-body-md text-muted-foreground">
              Enter the 6-digit code sent to {otpPhone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-title-sm font-semibold">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  {...otpForm.register('token', { required: 'OTP is required', minLength: { value: 6, message: 'Enter complete OTP' } })}
                  disabled={verifyOtpMutation.isPending}
                  autoComplete="one-time-code"
                />
                {otpForm.formState.errors.token && (
                  <p className="text-label-sm text-error">{otpForm.formState.errors.token.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={verifyOtpMutation.isPending}>
                {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setOtpStep(null)}>
                Change phone number
              </Button>
            </form>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Sign In" description="Sign in to your account" canonical="/login" />
      <Card className="w-full border-border/60 shadow-sm">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-headline-sm text-center font-bold">Sign in</CardTitle>
          <CardDescription className="text-center text-body-md text-muted-foreground">
            Sign in with email or phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="phone" className="flex-1 gap-2"><Phone className="h-4 w-4" /> Phone OTP</TabsTrigger>
              <TabsTrigger value="email" className="flex-1 gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-phone" className="text-title-sm font-semibold">Phone Number</Label>
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="+919000000001"
                    {...phoneForm.register('phone', { required: 'Phone number is required', pattern: { value: /^\+?\d{10,15}$/, message: 'Invalid phone number' } })}
                    disabled={loginMutation.isPending}
                    autoComplete="tel"
                  />
                  {phoneForm.formState.errors.phone && (
                    <p className="text-label-sm text-error">{phoneForm.formState.errors.phone.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="email">
              <form onSubmit={loginForm.handleSubmit(onEmailLogin)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-title-sm font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...loginForm.register('email', { required: 'Email is required' })}
                    disabled={loginMutation.isPending}
                    autoComplete="email"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-label-sm text-error">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-title-sm font-semibold">Password</Label>
                    <Link to={ROUTES.FORGOT_PASSWORD} className="text-label-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...loginForm.register('password', { required: 'Password is required' })}
                      disabled={loginMutation.isPending}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-label-sm text-error">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
