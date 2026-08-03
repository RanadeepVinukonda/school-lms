import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import { changePassword } from '@/supabase/auth';
import { getAllSubjects, getGradesByStudent, getUser, getClass } from '@/services/dataService';
import { useTranslation } from '@/hooks/useTranslation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';

export default function StudentProfilePage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('User not found');
      const firestoreUser = await getUser(authUser.id);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      const user = firestoreUser as typeof firestoreUser & { studentId?: string; classId?: string };
      const authId = user.id;

      const [allSubjects, grades, classDoc] = await Promise.all([
        getAllSubjects(),
        getGradesByStudent(authId),
        user.classId ? getClass(user.classId) : Promise.resolve(null),
      ]);

      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const studentSubjects = (classDoc?.subjectIds || [])
        .map((subId) => {
          const s = subjectMap.get(subId);
          if (!s) return null;
          return { ...s, icon: s.icon || 'school', color: s.color || 'hsl(var(--accent-default))' };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const enrichedGrades = grades
        .map((g) => ({ ...g, subject: g.subjectId ? (subjectMap.get(g.subjectId)?.name ?? 'Unknown') : 'Unknown' }));

      const avgPercentage = enrichedGrades.length > 0
        ? enrichedGrades.reduce((sum, g) => sum + g.percentage, 0) / enrichedGrades.length
        : 0;

      return { user, subjects: studentSubjects, grades: enrichedGrades, avgPercentage, totalSubjects: studentSubjects.length, className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null };
    },
    enabled: !!authUser,
  });

  useRealtimeInvalidation([{ table: 'profiles', queryKey: ['student-profile', authUser?.id ?? ''] }]);

  return (
    <>
      <SEOHead title={_('My Profile')} description={_('Your student profile and academic summary')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('My Profile')}</h1>
        </motion.div>
        <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? error ?? new Error(_('Failed to load profile')) : null} loadingType="profile" emptyMessage={_('Could not load profile information')} onRetry={() => refetch()} errorTitle={_('Failed to load profile')}>
          {(d) => (
            <div className="space-y-16">
              {/* School + User Header */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <ProfileHeader
                  user={d.user}
                  roleLabel={_('Student')}
                  subtitle={d.user.studentId ? `${_('Roll No')}: ${d.user.studentId}` : undefined}
                  badges={d.className ? <Badge variant="info" className="text-xs gap-1"><Icon name="school" size={12} />{d.className}{d.classGrade ? ` (${_('Grade')} ${d.classGrade})` : ''}</Badge> : undefined}
                  editHref="/student/profile/edit"
                />
              </motion.div>

              {/* Academic Overview */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><Icon name="school" size={20} className="text-primary" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Subjects')}</p><p className="text-display-xs font-bold">{d.totalSubjects}</p></div>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardStackReveal} custom={1}>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-success-container flex items-center justify-center shrink-0"><Icon name="grade" size={20} className="text-success" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Avg Grade')}</p><p className="text-display-xs font-bold">{d.avgPercentage.toFixed(0)}%</p></div>
                    </Card>
                  </motion.div>
                  <motion.div variants={cardStackReveal} custom={2}>
                    <Card className="p-5 flex items-center gap-4 border-border/60">
                      <div className="h-12 w-12 rounded-xl bg-warning-container flex items-center justify-center shrink-0"><Icon name="assignment" size={20} className="text-warning" /></div>
                      <div><p className="text-label-xs text-muted-foreground">{_('Completed')}</p><p className="text-display-xs font-bold">{d.grades.length}</p></div>
                    </Card>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Account Details */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <ProfileDetails user={d.user} includeDob />
              </motion.div>

              {/* Settings */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <div className="mb-6">
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('PREFERENCES')}</p>
                  <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Settings')}</h2>
                </div>
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <PasswordChangeDialog />
                      <Button variant="outline" className="justify-start gap-2" asChild>
                        <Link to="/notifications"><Icon name="notifications" size={16} />{_('Notifications')}</Link>
                      </Button>
                      <ThemeToggleButton />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
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
