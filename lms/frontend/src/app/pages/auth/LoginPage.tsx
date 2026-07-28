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

const countryCodes = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+61', label: 'AU +61' },
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+92', label: 'PK +92' },
  { code: '+880', label: 'BD +880' },
  { code: '+977', label: 'NP +977' },
  { code: '+94', label: 'LK +94' },
];

export default function LoginPage() {
  const [otpStep, setOtpStep] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();

  const phoneForm = useForm<{ phone: string }>({ defaultValues: { phone: '' } });
  const otpForm = useForm<{ token: string }>({ defaultValues: { token: '' } });

  async function onSendOtp(data: { phone: string }) {
    const fullPhone = `${countryCode}${data.phone}`;
    loginMutation.mutate({ phone: fullPhone }, {
      onSuccess: (result) => {
        if (result && 'otpSent' in result) {
          setOtpPhone(fullPhone);
          setOtpCode((result as any).code || '');
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
              {otpCode ? `Your OTP: ${otpCode}` : `Enter the 6-digit code sent to ${otpPhone}`}
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
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="flex h-10 w-[110px] shrink-0 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <Input
                  id="login-phone"
                  type="tel"
                  placeholder="9000000001"
                  className="flex-1"
                  {...phoneForm.register('phone', { required: 'Phone is required', pattern: { value: /^\d{7,15}$/, message: 'Enter a valid phone number' } })}
                  disabled={loginMutation.isPending}
                  autoComplete="tel-national"
                />
              </div>
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
