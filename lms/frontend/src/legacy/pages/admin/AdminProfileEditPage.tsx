import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { getUser, updateUser } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';

const ADMIN_SETTINGS_PROFILE = `${ROUTES.ADMIN_SETTINGS}?tab=profile`;

export default function AdminProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
  });

  const { data: userDoc, isLoading: loadingProfile } = useQuery({
    queryKey: ['admin-profile-edit', user?.id],
    queryFn: () => (user?.id ? getUser(user.id) : null),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (userDoc) {
      setForm({
        displayName: userDoc.displayName || '',
        email: userDoc.email || '',
        phone: userDoc.phone || '',
        bio: userDoc.bio || '',
        address: userDoc.address || '',
      });
    }
  }, [userDoc]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data: Record<string, unknown> = { ...form };
      await updateUser(user.id, data);
      setUser({ ...user, ...data } as typeof user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile-edit', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      toast.success('Profile updated');
      navigate(ADMIN_SETTINGS_PROFILE);
    },
    onError: () => toast.error('Failed to update profile'),
  });

  return (
    <>
      <SEOHead title="Edit Profile" description="Update your admin profile" />
      <div



        className="sm:p-6 p-4 max-w-2xl mx-auto pb-32"
      >
        <div className="space-y-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(ADMIN_SETTINGS_PROFILE)}>
              <Icon name="arrow_back" size={18} />
            </Button>
            <h1 className="text-headline-sm font-bold">Edit Profile</h1>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-5 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary-container text-primary">{getInitials(form.displayName)}</AvatarFallback>
                </Avatar>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input className="border-border/60 placeholder:text-muted-foreground" value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input className="border-border/60 placeholder:text-muted-foreground" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input className="border-border/60 placeholder:text-muted-foreground" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+1 555 123 4567" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea className="border-border/60 placeholder:text-muted-foreground" value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} placeholder="Tell us about yourself..." />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input className="border-border/60 placeholder:text-muted-foreground" value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Your address" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(ADMIN_SETTINGS_PROFILE)}>Cancel</Button>
                <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || loadingProfile}>
                  {saveMutation.isPending ? 'Saving...' : loadingProfile ? 'Loading...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
