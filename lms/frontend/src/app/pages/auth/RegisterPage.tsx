import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, ChevronRight, Check, User, Mail, Lock, GraduationCap } from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { cardStackReveal } from '@/lib/motion';

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const step2Schema = z.object({
  role: z.enum(['student', 'teacher'], { required_error: 'Select a role' }),
  grade: z.string().min(1, 'Select your grade'),
});

const gradeOptions = [
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' },
];

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { role: undefined, grade: '' },
  });

  const onStep1Submit = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const onStep2Submit = (data: Step2Data) => {
    setStep2Data(data);
    setStep(3);
  };

  const handleSubmitAll = async () => {
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast.success('Account created successfully!');
      navigate('/auth/login');
    } catch {
      toast.error('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead title="Create Account" description="Create your Genesis account" canonical="/auth/register" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-headline-sm">Create account</CardTitle>
              <CardDescription>Join the learning platform</CardDescription>
              <div className="flex items-center justify-center gap-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all',
                      s < step ? 'bg-primary border-primary text-primary-foreground' :
                      s === step ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground',
                    )}>
                      {s < step ? <Check className="h-4 w-4" /> : s}
                    </div>
                    {s < 3 && <div className={cn('h-0.5 w-8 mx-1', s < step ? 'bg-primary' : 'bg-muted-foreground/30')} />}
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.form key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="name" placeholder="John Doe" className="pl-10" {...step1Form.register('name')} />
                      </div>
                      {step1Form.formState.errors.name && <p className="text-sm text-destructive">{step1Form.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="you@school.edu" className="pl-10" {...step1Form.register('email')} />
                      </div>
                      {step1Form.formState.errors.email && <p className="text-sm text-destructive">{step1Form.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="Min 6 characters" className="pl-10" {...step1Form.register('password')} />
                      </div>
                      {step1Form.formState.errors.password && <p className="text-sm text-destructive">{step1Form.formState.errors.password.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" placeholder="Repeat password" {...step1Form.register('confirmPassword')} />
                      {step1Form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{step1Form.formState.errors.confirmPassword.message}</p>}
                    </div>
                    <Button type="submit" className="w-full"><ChevronRight className="h-4 w-4 mr-2" />Next</Button>
                  </motion.form>
                )}
                {step === 2 && (
                  <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>I am a...</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['student', 'teacher'] as const).map((r) => (
                          <button key={r} type="button" onClick={() => step2Form.setValue('role', r)} className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                            step2Form.watch('role') === r ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30',
                          )}>
                            <GraduationCap className={cn('h-6 w-6', step2Form.watch('role') === r ? 'text-primary' : 'text-muted-foreground')} />
                            <span className="text-sm font-medium capitalize">{r}</span>
                          </button>
                        ))}
                      </div>
                      {step2Form.formState.errors.role && <p className="text-sm text-destructive">{step2Form.formState.errors.role.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade / Class</Label>
                      <Select onValueChange={(v: string) => step2Form.setValue('grade', v)} defaultValue={step2Form.watch('grade')}>
                        <SelectTrigger id="grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {gradeOptions.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {step2Form.formState.errors.grade && <p className="text-sm text-destructive">{step2Form.formState.errors.grade.message}</p>}
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-2" />Back
                      </Button>
                      <Button type="submit" className="flex-1"><ChevronRight className="h-4 w-4 mr-2" />Next</Button>
                    </div>
                  </motion.form>
                )}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                    <div className="rounded-lg bg-muted p-4 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Name</span><span className="font-medium">{step1Data?.name}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium">{step1Data?.email}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{step2Data?.role}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Grade</span><span className="font-medium">Grade {step2Data?.grade}</span></div>
                    </div>
                    <Button className="w-full" disabled={isLoading} onClick={handleSubmitAll}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(2)} disabled={isLoading}>
                      <ChevronLeft className="h-4 w-4 mr-2" />Back
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
