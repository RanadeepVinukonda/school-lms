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
import { useTranslation } from '@/hooks/useTranslation';

export default function StudentProfileEditPage() {
  const { _ } = useTranslation();
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
    dateOfBirth: '',
  });

  const { data: userDoc, isLoading: loadingProfile } = useQuery({
    queryKey: ['student-profile-edit', user?.id],
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
        dateOfBirth: userDoc.dateOfBirth || '',
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
      queryClient.invalidateQueries({ queryKey: ['student-profile-edit', user?.id] });
      toast.success(_('Profile updated'));
      navigate(ROUTES.STUDENT_PROFILE);
    },
    onError: () => toast.error(_('Failed to update profile')),
  });

  return (
    <>
      <SEOHead title={_('Edit Profile')} description={_('Update your student profile')} />
      <div



        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.STUDENT_PROFILE)}>
              <Icon name="arrow_back" size={18} />
            </Button>
            <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Edit Profile')}</h1>
          </div>
        </div>

        <div>
          <Card className="border-border/60">
            <CardContent className="sm:p-6 p-4 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary-container text-primary">{getInitials(form.displayName)}</AvatarFallback>
                </Avatar>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-label-sm">{_('Full Name')}</Label>
                  <Input value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-label-sm">{_('Email')}</Label>
                  <Input value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-label-sm">{_('Phone')}</Label>
                  <Input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder={_('+1 555 123 4567')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-label-sm">{_('Date of Birth')}</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-label-sm">{_('Bio')}</Label>
                <Textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} placeholder={_('Tell us about yourself...')} />
              </div>

              <div className="space-y-2">
                <Label className="text-label-sm">{_('Address')}</Label>
                <Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder={_('Your address')} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(ROUTES.STUDENT_PROFILE)}>{_('Cancel')}</Button>
                <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || loadingProfile}>
                  {saveMutation.isPending ? _('Saving...') : loadingProfile ? _('Loading...') : _('Save Changes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
