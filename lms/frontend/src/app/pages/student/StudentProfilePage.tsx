import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import { changePassword } from '@/supabase/auth';
import { getAllSubjects, getGradesByStudent, getUser, getClass } from '@/services/dataService';
import { XPBar } from '@/components/gamification/XPBar';
import { XP_THRESHOLDS } from '@/components/gamification/constants';
import api from '@/services/api';
import { useTranslation } from '@/hooks/useTranslation';

function EmptySection({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon name={icon} size={32} className="text-muted-foreground/50 mb-2" />
      <p className="text-body-md text-muted-foreground">{message}</p>
    </div>
  );
}

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

      const [allSubjects, grades, classDoc, gamification, perf] = await Promise.all([
        getAllSubjects(),
        getGradesByStudent(authId),
        user.classId ? getClass(user.classId) : Promise.resolve(null),
        api.get('/gamification/profile/me').then(r => r.data.data).catch(() => null),
        api.get(`/analytics-v2/student/${authId}`).then(r => r.data.data).catch(() => null),
      ]);

      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const studentSubjects = (classDoc?.subjectIds || [])
        .map((subId) => {
          const s = subjectMap.get(subId);
          if (!s) return null;
          return { ...s, icon: s.icon || 'school', color: s.color || '#6366f1' };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const enrichedGrades = grades
        .map((g) => ({ ...g, subject: g.subjectId ? (subjectMap.get(g.subjectId)?.name ?? 'Unknown') : 'Unknown' }));

      const assignmentGrades = enrichedGrades.filter((g) => !g.itemName?.toLowerCase().includes('exam'));
      const avgPercentage = enrichedGrades.length > 0
        ? enrichedGrades.reduce((sum, g) => sum + g.percentage, 0) / enrichedGrades.length
        : 0;

      return { user, subjects: studentSubjects, grades: enrichedGrades, assignmentGrades, avgPercentage, totalSubjects: studentSubjects.length, className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null, gamification, perf };
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
              {/* School Information */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <Card className="border-border/60 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-5">
                      <img src="/genesis_icon.png" alt={_('Genesis School Crest')} className="h-20 w-auto object-contain shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-headline-sm font-bold">{_('Genesis International Montessori & STEM School')}</h2>
                        <p className="text-warning uppercase text-xs tracking-wider font-semibold mt-0.5">{_('Learn · Lead · Achieve')}</p>
                        <p className="text-body-sm text-muted-foreground mt-2">{_('A premier institution dedicated to academic excellence, leadership development, and holistic student growth.')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">{_('Academic Year')}</p>
                            <p className="text-sm font-semibold">2025&ndash;2026</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{_('Campus')}</p>
                            <p className="text-sm font-semibold">{_('Main Campus')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{_('School Motto')}</p>
                            <p className="text-sm font-semibold">{_('Learn · Lead · Achieve')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Personal Information */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <Card className="border-border/60">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={d.user.avatar} alt={d.user.displayName} />
                      <AvatarFallback className="text-xl font-bold bg-primary-container text-primary">{getInitials(d.user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-title-md font-bold">{d.user.displayName}</h2>
                      <p className="text-body-md text-muted-foreground">{_('Student')} &middot; {_('Roll No')}: {d.user.studentId ?? _('N/A')}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs gap-1"><Icon name="mail" size={12} />{d.user.email}</Badge>
                        {d.className && <Badge variant="info" className="text-xs gap-1"><Icon name="school" size={12} />{d.className}{d.classGrade ? ` (${_('Grade')} ${d.classGrade})` : ''}</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <Link to="/student/profile/edit"><Icon name="edit" size={14} />{_('Edit')}</Link>
                    </Button>
                  </CardContent>
                </Card>
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

              {/* Performance & Activity */}
              {d.gamification && (
                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <div className="mb-6">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('PERFORMANCE')}</p>
                    <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Gamification & Activity')}</h2>
                  </div>
                  <Card className="border-border/60">
                    <CardContent className="p-5 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><Icon name="emoji_events" size={18} className="text-primary" /></div>
                          <div><p className="text-label-xs text-muted-foreground">{_('Level')}</p><p className="text-title-sm font-bold">{d.gamification.level ?? 1}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-warning-container flex items-center justify-center shrink-0"><Icon name="monetization_on" size={18} className="text-warning" /></div>
                          <div><p className="text-label-xs text-muted-foreground">{_('Coins')}</p><p className="text-title-sm font-bold">{d.gamification.coins ?? 0}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-success-container flex items-center justify-center shrink-0"><Icon name="local_fire_department" size={18} className="text-success" /></div>
                          <div><p className="text-label-xs text-muted-foreground">{_('Streak')}</p><p className="text-title-sm font-bold">{d.gamification.streak ?? 0} {_('days')}</p></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-info-container flex items-center justify-center shrink-0"><Icon name="assessment" size={18} className="text-info" /></div>
                          <div><p className="text-label-xs text-muted-foreground">{_('Badges')}</p><p className="text-title-sm font-bold">{d.gamification.badges?.length ?? 0}</p></div>
                        </div>
                      </div>
                      {(() => {
                        const lvl = d.gamification.level ?? 1;
                        const xp = d.gamification.xp ?? 0;
                        const before = lvl > 1 ? (XP_THRESHOLDS[lvl - 1] ?? 0) : 0;
                        const after = XP_THRESHOLDS[lvl] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + 1000;
                        return <XPBar xp={xp} level={lvl} xpForCurrentLevel={before} xpForNextLevel={after} />;
                      })()}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {d.perf && d.perf.recentActivity && d.perf.recentActivity.length > 0 && (
                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <Card className="border-border/60">
                    <CardHeader>
                      <CardTitle className="text-title-sm flex items-center gap-2"><Icon name="history" size={18} />{_('Recent Activity')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <div className="space-y-2">
                        {d.perf.recentActivity.slice(0, 5).map((a: { type: string; title: string; score: number; date: string }, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{a.title}</p>
                              <p className="text-xs text-muted-foreground capitalize">{a.type} &middot; {formatDate(a.date)}</p>
                            </div>
                            <span className={cn('text-sm font-bold shrink-0 ml-3', a.score >= 80 ? 'text-success' : a.score >= 60 ? 'text-warning' : 'text-error')}>
                              {a.score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Assignment History */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <div className="mb-6">
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('ACADEMICS')}</p>
                  <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Assignment History')}</h2>
                </div>
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    {d.assignmentGrades.length === 0 ? <EmptySection icon="assignment" message={_('No assignments graded yet')} /> : (
                      <div className="space-y-2">
                        {d.assignmentGrades.map((g) => {
                          const letter = getLetterGrade(g.percentage);
                          const grColor = g.percentage >= 80 ? 'text-success' : g.percentage >= 60 ? 'text-warning' : 'text-error';
                          return (
                            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{g.itemName ?? _('Assessment')}</p>
                                <p className="text-xs text-muted-foreground">{g.subject} &middot; {formatDate(g.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="text-sm tabular-nums">{g.score}/{g.totalPoints}</span>
                                <span className={cn('text-sm font-bold', grColor)}>{letter}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
