import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { pageTransition, listItem } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import {
  mockEnrollments,
  mockSubjects,
  mockGrades,
  mockExams,
  mockCorrections,
  mockClasses,
} from '@/lib/mockData';

const achievements = [
  { name: 'Quick Learner', icon: 'bolt', desc: 'Completed first 5 lessons in a week', date: new Date(Date.now() - 30 * 86400000).toISOString() },
  { name: 'Perfect Score', icon: 'stars', desc: 'Scored 100% on a quiz', date: new Date(Date.now() - 20 * 86400000).toISOString() },
  { name: 'Consistent', icon: 'trending_up', desc: '7-day study streak', date: new Date(Date.now() - 15 * 86400000).toISOString() },
  { name: 'Top Performer', icon: 'military_tech', desc: 'Top 10% of the class', date: new Date(Date.now() - 10 * 86400000).toISOString() },
  { name: 'Early Bird', icon: 'wb_sunny', desc: 'Submitted 3 assignments before deadline', date: new Date(Date.now() - 5 * 86400000).toISOString() },
];

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
      await new Promise((r) => setTimeout(r, 300));
      const rawUser = useAuthStore.getState().user;
      if (!rawUser) throw new Error('User not found');
      const user = rawUser as typeof rawUser & { studentId?: string; classId?: string };
      const studentId = user.studentId ?? user.id;
      const studentClass = mockClasses.find((c) => c.id === user.classId);
      const enrollments = mockEnrollments.filter((e) => e.studentId === studentId);
      const enrolledSubjects = enrollments
        .map((e) => {
          const s = mockSubjects.find((sub) => sub.id === e.subjectId);
          if (!s) return null;
          return { ...s, progress: e.progress, icon: s.icon || 'school', color: s.color || '#6366f1' };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      const grades = mockGrades.filter((g) => g.studentId === studentId)
        .map((g) => ({ ...g, subject: mockSubjects.find((s) => s.id === g.subjectId)?.name ?? 'Unknown' }));
      const now = new Date();
      const upcomingExams = mockExams
        .map((e) => ({ ...e, subject: mockSubjects.find((s) => s.id === e.subjectId)?.name ?? 'Unknown' }))
        .filter((e) => new Date(e.startDate) > now);
      const corrections = mockCorrections.filter((c) => c.studentId === studentId).map((c) => {
        const exam = mockExams.find((e) => e.id === c.examId);
        const maxScore = exam?.questions.reduce((sum, q) => sum + q.points, 0) ?? 0;
        return { ...c, examTitle: exam?.title ?? 'Unknown', subject: exam ? mockSubjects.find((s) => s.id === exam.subjectId)?.name ?? 'Unknown' : 'Unknown', maxScore };
      });
      const assignmentGrades = grades.filter((g) => g.type === 'assignment');
      const avgPercentage = grades.length > 0 ? grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length : 0;
      return { user, studentClass, enrolledSubjects, grades, upcomingExams, corrections, assignmentGrades, avgPercentage, totalEnrolled: enrolledSubjects.length };
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
                      <p className="text-body-md text-muted-foreground">Student &middot; ID: {d.user.studentId ?? 'N/A'}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs gap-1"><Icon name="mail" size={12} />{d.user.email}</Badge>
                        {d.studentClass && <Badge variant="outline" className="text-xs gap-1"><Icon name="group" size={12} />{d.studentClass.name}</Badge>}
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
                    <div className="h-10 w-10 rounded-full bg-error-container flex items-center justify-center shrink-0"><Icon name="calendar_today" size={20} className="text-error" /></div>
                    <div><p className="text-xs text-muted-foreground">Upcoming Exams</p><p className="text-lg font-bold">{d.upcomingExams.length}</p></div>
                  </Card>
                </div>
              </motion.div>

              {/* Subject Progress */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="school" size={18} />Subject Progress</CardTitle></CardHeader>
                  <CardContent>
                    {d.enrolledSubjects.length === 0 ? <EmptySection icon="school" message="Not enrolled in any subjects" /> : (
                      <div className="space-y-4">
                        {d.enrolledSubjects.map((subject) => (
                          <motion.div key={subject.id} variants={listItem} initial="hidden" animate="show" className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${subject.color}20` }}>
                                  <Icon name={subject.icon} size={16} style={{ color: subject.color }} />
                                </div>
                                <span className="text-sm font-medium truncate">{subject.name}</span>
                              </div>
                              <span className="text-xs font-medium tabular-nums shrink-0 ml-3">{subject.progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-variant overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${subject.progress}%`, backgroundColor: subject.color }} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Exam History */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="quiz" size={18} />Exam History</CardTitle></CardHeader>
                  <CardContent>
                    {d.corrections.length === 0 ? <EmptySection icon="quiz" message="No exams completed yet" /> : (
                      <div className="space-y-3">
                        {d.corrections.map((c) => {
                          const passed = c.totalMarks >= c.maxScore * 0.5;
                          return (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/50">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{c.examTitle}</p>
                                <p className="text-xs text-muted-foreground">{c.subject} &middot; {formatDate(c.correctedAt)}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="text-sm font-bold tabular-nums">{c.totalMarks}/{c.maxScore}</span>
                                <Badge variant={passed ? 'success' : 'destructive'}>{passed ? 'Pass' : 'Fail'}</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                                <p className="text-sm font-medium truncate">{g.itemName}</p>
                                <p className="text-xs text-muted-foreground">{g.subject} &middot; {formatDate(g.gradedAt)}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className="text-sm tabular-nums">{g.score}/{g.maxScore}</span>
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

              {/* Achievements */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="emoji_events" size={18} />Achievements</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                      {achievements.map((a) => (
                        <motion.div key={a.name} variants={listItem} initial="hidden" animate="show" className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors group cursor-default" title={a.desc}>
                          <div className="h-12 w-12 rounded-full bg-warning-container flex items-center justify-center group-hover:scale-110 transition-transform"><Icon name={a.icon} size={22} className="text-warning" /></div>
                          <span className="text-[10px] font-semibold text-center leading-tight">{a.name}</span>
                          <span className="text-[9px] text-muted-foreground text-center">{formatDate(a.date)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Settings */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon name="settings" size={18} />Settings</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button variant="outline" className="justify-start gap-2" asChild><Link to="/student/settings"><Icon name="lock" size={16} />Change Password</Link></Button>
                      <Button variant="outline" className="justify-start gap-2" asChild><Link to="/student/settings?tab=notifications"><Icon name="notifications" size={16} />Notifications</Link></Button>
                      <Button variant="outline" className="justify-start gap-2" asChild><Link to="/student/settings?tab=theme"><Icon name="palette" size={16} />Theme</Link></Button>
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
