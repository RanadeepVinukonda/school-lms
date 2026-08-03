import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal } from '@/lib/motion';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { uploadProfileImage } from '@/services/avatarService';
import { getUser, updateUser } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

export default function StudentProfileEditPage() {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    dateOfBirth: '',
  });

  const [avatarPreview, setAvatarPreview] = useState('');

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
      setAvatarPreview(userDoc.photoURL || '');
    }
  }, [userDoc]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProfileImage(user?.id || 'temp', file);
      setAvatarPreview(url);
      toast.success(_('Avatar uploaded'));
    } catch {
      toast.error(_('Avatar upload failed. Check Supabase Storage bucket.'));
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const data: Record<string, unknown> = { ...form };
      if (avatarPreview) data.photoURL = avatarPreview;
      await updateUser(user.id, data);
      const { photoURL, ...rest } = data;
      setUser({ ...user, ...rest, avatar: (photoURL as string | undefined) || user.avatar } as typeof user);
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.STUDENT_PROFILE)}>
              <Icon name="arrow_back" size={18} />
            </Button>
            <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Edit Profile')}</h1>
          </div>
        </motion.div>

        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <Card className="border-border/60">
            <CardContent className="sm:p-6 p-4 space-y-6">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarPreview} alt={form.displayName} />
                  <AvatarFallback className="text-2xl bg-primary-container text-primary">{getInitials(form.displayName)}</AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Icon name="camera_alt" size={15} className="mr-1" />
                  {uploading ? _('Uploading...') : _('Change Photo')}
                </Button>
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
        </motion.div>
      </motion.div>
    </>
  );
}
