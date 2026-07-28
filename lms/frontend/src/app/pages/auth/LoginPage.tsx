import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SEOHead } from '@/components/common/SEOHead';
import { useLogin, useVerifyOtp } from '@/features/auth/hooks/useLogin';

export default function LoginPage() {
  const [otpStep, setOtpStep] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();

  const phoneForm = useForm<{ phone: string }>({ defaultValues: { phone: '' } });
  const otpForm = useForm<{ token: string }>({ defaultValues: { token: '' } });

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
            Sign in with your phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </>
  );
}
