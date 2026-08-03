import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/Icon';
import { useUIStore } from '@/store/uiStore';
import { changePassword } from '@/supabase/auth';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProfilePreferences() {
  const { _ } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('PREFERENCES')}</p>
        <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Settings')}</h2>
      </div>
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PasswordChangeDialog />
            <Button variant="outline" className="justify-start gap-2" asChild>
              <Link to={ROUTES.NOTIFICATIONS}><Icon name="notifications" size={16} />{_('Notifications')}</Link>
            </Button>
            <ThemeToggleButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordChangeDialog() {
  const { _ } = useTranslation();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);
    if (newPw !== confirm) { setError(_('Passwords do not match')); return; }
    if (newPw.length < 6) { setError(_('Password must be at least 6 characters')); return; }
    setLoading(true);
    try {
      await changePassword(current, newPw);
      setSuccess(true);
      setCurrent('');
      setNewPw('');
      setConfirm('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : _('Failed to change password');
      if (msg.includes('auth/invalid-credential')) setError(_('Current password is incorrect'));
      else if (msg.includes('auth/requires-recent-login')) setError(_('Please log out and log in again'));
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-start gap-2"><Icon name="lock" size={16} />{_('Change Password')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{_('Change Password')}</DialogTitle>
          <DialogDescription>{_('Enter your current password and a new password.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="password" placeholder={_('Current password')} value={current} onChange={(e) => { setCurrent(e.target.value); setError(''); setSuccess(false); }} />
          <Input type="password" placeholder={_('New password')} value={newPw} onChange={(e) => { setNewPw(e.target.value); setError(''); setSuccess(false); }} />
          <Input type="password" placeholder={_('Confirm new password')} value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); setSuccess(false); }} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">{_('Password changed successfully!')}</p>}
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">{_('Cancel')}</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? _('Changing...') : _('Change Password')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeToggleButton() {
  const { _ } = useTranslation();
  const { theme, setTheme } = useUIStore();
  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  };
  const icon = theme === 'dark' ? 'dark_mode' : theme === 'light' ? 'light_mode' : 'contrast';
  const label = theme === 'dark' ? _('Dark Mode') : theme === 'light' ? _('Light Mode') : _('System Theme');
  return (
    <Button variant="outline" className="justify-start gap-2" onClick={cycleTheme}>
      <Icon name={icon} size={16} />{label}
    </Button>
  );
}
