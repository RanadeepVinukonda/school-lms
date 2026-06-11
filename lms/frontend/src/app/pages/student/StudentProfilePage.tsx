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
import { pageTransition, listItem } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { changePassword } from '@/firebase/auth';
import { getAllSubjects, getEnrollmentsByStudent, getGradesByStudent, getUser, getClass } from '@/services/dataService';

function EmptySection({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon name={icon} size={32} className="text-muted-foreground/50 mb-2" />
      <p className="text-body-md text-muted-foreground">{message}</p>
    </div>
  );
}

export default function StudentProfilePage() {
  const authUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-profile', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('User not found');
      const firestoreUser = await getUser(authUser.id);
      if (!firestoreUser) throw new Error('User not found in Firestore');
      const user = firestoreUser as typeof firestoreUser & { studentId?: string; classId?: string };
      const authId = user.id;

      const [allSubjects, enrollments, grades, classDoc] = await Promise.all([
        getAllSubjects(),
        getEnrollmentsByStudent(authId),
        getGradesByStudent(authId),
        user.classId ? getClass(user.classId) : Promise.resolve(null),
      ]);

      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const enrolledSubjects = enrollments
        .map((e) => {
          const s = subjectMap.get(e.courseId);
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

      return { user, enrolledSubjects, grades: enrichedGrades, assignmentGrades, avgPercentage, totalEnrolled: enrolledSubjects.length, className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null };
    },
    enabled: !!authUser,
  });

  return (
    <>
      <SEOHead title="My Profile" description="Your student profile and academic summary" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <h1 className="text-headline-sm font-bold">My Profile</h1>
        <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? error ?? new Error('Failed to load profile') : null} loadingType="profile" emptyMessage="Could not load profile information" onRetry={() => refetch()} errorTitle="Failed to load profile">
          {(d) => (
            <div className="space-y-6">
              {/* School Information */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated" className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-5">
                      <img src="/genesis_icon.png" alt="Genesis School Crest" className="h-20 w-auto object-contain shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold">Genesis International Montessori &amp; STEM School</h2>
                        <p className="text-warning uppercase text-xs tracking-wider font-semibold mt-0.5">Learn &middot; Lead &middot; Achieve</p>
                        <p className="text-body-sm text-muted-foreground mt-2">A premier institution dedicated to academic excellence, leadership development, and holistic student growth.</p>
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Academic Year</p>
                            <p className="text-sm font-semibold">2025&ndash;2026</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Campus</p>
                            <p className="text-sm font-semibold">Main Campus</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">School Motto</p>
                            <p className="text-sm font-semibold">Learn &middot; Lead &middot; Achieve</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Personal Information */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={d.user.avatar} alt={d.user.displayName} />
                      <AvatarFallback className="text-xl font-bold bg-primary-container text-primary">{getInitials(d.user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center sm:text-left">
                      <h2 className="text-xl font-bold">{d.user.displayName}</h2>
                      <p className="text-body-md text-muted-foreground">Student &middot; Roll No: {d.user.studentId ?? 'N/A'}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs gap-1"><Icon name="mail" size={12} />{d.user.email}</Badge>
                        {d.className && <Badge variant="info" className="text-xs gap-1"><Icon name="school" size={12} />{d.className}{d.classGrade ? ` (Grade ${d.classGrade})` : ''}</Badge>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <Link to="/student/profile/edit"><Icon name="edit" size={14} />Edit</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Academic Overview */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <div className="grid grid-cols-2 gap-3">
                  <Card variant="elevated" className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center shrink-0"><Icon name="school" size={20} className="text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Subjects</p><p className="text-lg font-bold">{d.totalEnrolled}</p></div>
                  </Card>
                  <Card variant="elevated" className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success-container flex items-center justify-center shrink-0"><Icon name="grade" size={20} className="text-success" /></div>
                    <div><p className="text-xs text-muted-foreground">Avg Grade</p><p className="text-lg font-bold">{d.avgPercentage.toFixed(0)}%</p></div>
                  </Card>
                  <Card variant="elevated" className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-warning-container flex items-center justify-center shrink-0"><Icon name="assignment" size={20} className="text-warning" /></div>
                    <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-lg font-bold">{d.grades.length}</p></div>
                  </Card>
                  <Card variant="elevated" className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-container/50 flex items-center justify-center shrink-0"><Icon name="trending_up" size={20} className="text-primary" /></div>
                    <div><p className="text-xs text-muted-foreground">Enrolled</p><p className="text-lg font-bold">{d.enrolledSubjects.length}</p></div>
                  </Card>
                </div>
              </motion.div>



              {/* Assignment History */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="assignment" size={18} />Assignment History</CardTitle></CardHeader>
                  <CardContent>
                    {d.assignmentGrades.length === 0 ? <EmptySection icon="assignment" message="No assignments graded yet" /> : (
                      <div className="space-y-2">
                        {d.assignmentGrades.map((g) => {
                          const letter = getLetterGrade(g.percentage);
                          const grColor = g.percentage >= 80 ? 'text-success' : g.percentage >= 60 ? 'text-warning' : 'text-error';
                          return (
                            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{g.itemName ?? 'Assessment'}</p>
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
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="settings" size={18} />Settings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <PasswordChangeDialog />
                      <Button variant="outline" className="justify-start gap-2" asChild>
                        <Link to="/notifications"><Icon name="notifications" size={16} />Notifications</Link>
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
    if (newPw !== confirm) { setError('Passwords do not match'); return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await changePassword(current, newPw);
      setSuccess(true);
      setCurrent('');
      setNewPw('');
      setConfirm('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to change password';
      if (msg.includes('auth/invalid-credential')) setError('Current password is incorrect');
      else if (msg.includes('auth/requires-recent-login')) setError('Please log out and log in again');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-start gap-2"><Icon name="lock" size={16} />Change Password</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and a new password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="password" placeholder="Current password" value={current} onChange={(e) => { setCurrent(e.target.value); setError(''); setSuccess(false); }} />
          <Input type="password" placeholder="New password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setError(''); setSuccess(false); }} />
          <Input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); setSuccess(false); }} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">Password changed successfully!</p>}
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useUIStore();
  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  };
  const icon = theme === 'dark' ? 'dark_mode' : theme === 'light' ? 'light_mode' : 'contrast';
  const label = theme === 'dark' ? 'Dark Mode' : theme === 'light' ? 'Light Mode' : 'System Theme';
  return (
    <Button variant="outline" className="justify-start gap-2" onClick={cycleTheme}>
      <Icon name={icon} size={16} />{label}
    </Button>
  );
}
