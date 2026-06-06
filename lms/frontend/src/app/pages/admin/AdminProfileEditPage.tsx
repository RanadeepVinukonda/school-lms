import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { uploadProfileImage } from '@/services/cloudinaryService';
import { getUser, updateUser } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';

export default function AdminProfileEditPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
  });

  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!user?.id) { setLoadingProfile(false); return; }
    getUser(user.id)
      .then((userDoc) => {
        if (userDoc) {
          setForm({
            displayName: userDoc.displayName || '',
            email: userDoc.email || '',
            phone: userDoc.phone || '',
            bio: userDoc.bio || '',
            address: userDoc.address || '',
          });
          setAvatarPreview(userDoc.avatar || '');
        }
        setLoadingProfile(false);
      })
      .catch(() => { setLoadingProfile(false); toast.error('Failed to load profile data'); });
  }, [user?.id]);

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
      toast.success('Avatar uploaded');
    } catch {
      toast.error('Avatar upload failed. Check Cloudinary config.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        ...form,
        avatar: avatarPreview || user.avatar,
      };
      await updateUser(user.id, data);
      setUser({ ...user, ...data } as typeof user);
      toast.success('Profile updated');
      navigate(ROUTES.ADMIN_DASHBOARD);
    } catch (err: any) {
      console.error('Profile update error:', err);
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SEOHead title="Edit Profile" description="Update your admin profile" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-2xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>
            <Icon name="arrow_back" size={18} />
          </Button>
          <h1 className="text-headline-sm font-bold">Edit Profile</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview} alt={form.displayName} />
                <AvatarFallback className="text-2xl bg-primary-container text-primary">{getInitials(form.displayName)}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <Icon name="camera_alt" size={15} className="mr-1" />
                {uploading ? 'Uploading...' : 'Change Photo'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.displayName} onChange={(e) => handleChange('displayName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+1 555 123 4567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} rows={3} placeholder="Tell us about yourself..." />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Your address" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || loadingProfile}>
                {saving ? 'Saving...' : loadingProfile ? 'Loading...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
