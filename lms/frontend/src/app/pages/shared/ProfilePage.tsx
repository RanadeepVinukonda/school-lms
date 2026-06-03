import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Lock, Camera, Save, Loader2,
  Eye, EyeOff, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  bio: z.string().max(200, 'Bio must be under 200 characters').optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Minimum 6 characters'),
  newPassword: z.string().min(6, 'Minimum 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '', bio: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const profileMutation = useMutation({
    mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); },
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); },
    onSuccess: () => { toast.success('Password changed'); passwordForm.reset(); },
    onError: () => toast.error('Failed to change password'),
  });

  return (
    <>
      <SEOHead title="Profile" description="Your profile settings" canonical="/profile" />
      <div className="p-4 max-w-3xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>

      <Card className="mb-4">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">AM</AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white shadow">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">Alex M.</p>
            <p className="text-sm text-muted-foreground">Student</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1"><User className="h-4 w-4 mr-1" />Info</TabsTrigger>
          <TabsTrigger value="security" className="flex-1"><Lock className="h-4 w-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1"><Shield className="h-4 w-4 mr-1" />Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <form onSubmit={profileForm.handleSubmit(() => profileMutation.mutate())}>
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" {...profileForm.register('name')} />
                  </div>
                  {profileForm.formState.errors.name && <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" type="email" {...profileForm.register('email')} />
                  </div>
                  {profileForm.formState.errors.email && <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" {...profileForm.register('phone')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea rows={3} {...profileForm.register('bio')} />
                  {profileForm.formState.errors.bio && <p className="text-sm text-destructive">{profileForm.formState.errors.bio.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <form onSubmit={passwordForm.handleSubmit(() => passwordMutation.mutate())}>
            <Card>
              <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input type={showCurrent ? 'text' : 'password'} {...passwordForm.register('currentPassword')} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input type={showNew ? 'text' : 'password'} {...passwordForm.register('newPassword')} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNew(!showNew)}>
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" {...passwordForm.register('confirmPassword')} />
                  {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Grade Updates', desc: 'When a new grade is posted' },
                { label: 'Assignment Reminders', desc: 'Before an assignment due date' },
                { label: 'Messages', desc: 'When someone sends you a message' },
                { label: 'Announcements', desc: 'School and course announcements' },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
              <Button className="w-full" onClick={() => toast.success('Preferences saved')}>
                <Save className="h-4 w-4 mr-2" />Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
