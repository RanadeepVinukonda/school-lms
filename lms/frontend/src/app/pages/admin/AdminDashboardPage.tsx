import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockClasses, mockExams, mockAssignments, mockGrades } from '@/lib/mockData';

const findUser = (id: string) => Object.values(mockUsers).find((u) => u.id === id);

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const users = Object.values(mockUsers);
      const studentCount = users.filter((u) => u.role === 'student').length;
      const teacherCount = users.filter((u) => u.role === 'teacher').length;
      const upcomingExamCount = mockExams.filter((e) => new Date(e.startDate) > new Date()).length;

      const atRiskStudents = mockGrades
        .filter((g) => g.percentage < 70)
        .map((g) => ({
          id: g.id,
          studentName: findUser(g.studentId)?.displayName ?? 'Unknown',
          percentage: g.percentage,
          subject: g.itemName,
        }));

      const workloadMap = new Map<string, number>();
      for (const cls of mockClasses) {
        workloadMap.set(cls.classTeacherId, (workloadMap.get(cls.classTeacherId) ?? 0) + 1);
      }
      const teacherWorkload = Array.from(workloadMap.entries()).map(([id, count]) => ({
        name: findUser(id)?.displayName ?? 'Unknown',
        classCount: count,
      }));

      const feed: Array<{ id: string; title: string; desc: string; ts: string }> = [];
      for (const exam of mockExams) {
        feed.push({ id: `e-${exam.id}`, title: 'New Exam Created', desc: exam.title, ts: exam.endDate });
      }
      for (const a of mockAssignments) {
        feed.push({ id: `a-${a.id}`, title: 'New Assignment Posted', desc: a.title, ts: a.dueDate });
      }
      for (const g of mockGrades) {
        const s = findUser(g.studentId);
        feed.push({
          id: `g-${g.id}`,
          title: 'Grade Submitted',
          desc: `${s?.displayName ?? 'Unknown'} \u2014 ${g.itemName}: ${g.score}/${g.maxScore}`,
          ts: g.gradedAt,
        });
      }
      feed.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return { studentCount, teacherCount, classCount: mockClasses.length, upcomingExamCount, atRiskStudents, teacherWorkload, activityFeed: feed.slice(0, 8) };
    },
  });

  const statCards = useMemo(() => [
    { icon: 'groups', label: 'Total Students', value: data?.studentCount ?? 0, color: 'text-primary', bg: 'bg-primary-container' },
    { icon: 'badge', label: 'Total Teachers', value: data?.teacherCount ?? 0, color: 'text-success', bg: 'bg-success-container' },
    { icon: 'meeting_room', label: 'Active Classes', value: data?.classCount ?? 0, color: 'text-warning', bg: 'bg-warning-container' },
    { icon: 'calendar_month', label: 'Upcoming Exams', value: data?.upcomingExamCount ?? 0, color: 'text-error', bg: 'bg-error-container' },
  ], [data]);

  return (
    <>
      <SEOHead title="School Health Dashboard" description="Actionable insights and school health metrics" canonical="/admin/dashboard" />
      <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? new Error('Failed to load dashboard') : null} onRetry={() => refetch()} loadingType="card">
        {(d) => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={listItem}>
                <h1 className="text-headline-sm">School Health Dashboard</h1>
                <p className="text-sm text-on-surface-variant">Actionable insights for administrators</p>
              </motion.div>

              <motion.div variants={listItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s) => (
                  <Card key={s.label} variant="elevated">
                    <CardContent className="p-5">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                        <Icon name={s.icon} size={22} className={s.color} />
                      </div>
                      <p className="text-2xl font-bold tracking-tight mt-3">{s.value}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={listItem}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="warning" size={18} className="text-error" />
                        At-Risk Students
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {d.atRiskStudents.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-on-surface-variant">
                          <Icon name="trending_up" size={36} />
                          <p className="text-sm mt-2">All students performing well</p>
                          <p className="text-xs">No grades below 70% threshold</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {d.atRiskStudents.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-error-container/30 border border-error/20">
                              <div>
                                <p className="text-sm font-medium">{s.studentName}</p>
                                <p className="text-xs text-on-surface-variant">{s.subject}</p>
                              </div>
                              <span className="text-sm font-bold text-error">{s.percentage}%</span>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                            <Link to="/admin/students">View All Students</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="badge" size={18} className="text-on-surface-variant" />
                        Teacher Workload
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {d.teacherWorkload.length === 0 ? (
                        <div className="flex flex-col items-center py-8 text-on-surface-variant">
                          <Icon name="badge" size={36} />
                          <p className="text-sm mt-2">No teachers assigned</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {d.teacherWorkload.map((t) => (
                            <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/50">
                              <span className="text-sm font-medium">{t.name}</span>
                              <span className="text-sm text-on-surface-variant">{t.classCount} {t.classCount === 1 ? 'class' : 'classes'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={listItem}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-md flex items-center gap-2">
                      <Icon name="history" size={18} className="text-on-surface-variant" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d.activityFeed.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-on-surface-variant">
                        <Icon name="history" size={36} />
                        <p className="text-sm mt-2">No recent activity</p>
                      </div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-surface-variant space-y-4">
                        {d.activityFeed.map((item) => (
                          <div key={item.id} className="relative">
                            <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-on-surface-variant">{item.desc}</p>
                            <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                              {new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>
    </>
  );
}
