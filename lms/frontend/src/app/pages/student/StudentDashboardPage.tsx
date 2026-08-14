import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { cn, getTimeGreeting } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import api from '@/services/api';
import { getClass } from '@/services/dataService';
import { mindmapService } from '@/services/mindmapService';
import { PerformanceLogoBadge } from '@/components/common/PerformanceLogoBadge';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface ResultEntry { id: string; itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string; feedback?: string }

interface DashboardData {
  displayName: string; greeting: string; motivationalMessage: string; todayDate: string;
  recentResults: ResultEntry[]; subjectsCount: number; className: string | null;
  classGrade: string | null; avgGrade: number; totalAssessments: number;
}

function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{title}</h2>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.displayName ?? _('Student');
  const studentId = authUser?.id;
  const messages = [
    _('Every expert was once a beginner. Keep going!'),
    _('The secret of getting ahead is getting started.'),
    _('Education is the most powerful weapon to change the world.'),
    _('The beautiful thing about learning is that no one can take it away from you.'),
    _('Success is the sum of small efforts repeated day in and day out.'),
    _('Believe you can and you are halfway there.'),
  ];
  const messageIndex = new Date().getDate() % messages.length;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) throw new Error('Not authenticated');
      const now = new Date();
      const greeting = getTimeGreeting();
      const authUserData = useAuthStore.getState().user;
      const [dashRes, classDoc] = await Promise.all([
        api.get(`/analytics/student/dashboard`).then((r) => r.data.data),
        (async () => {
          if (!authUserData?.classId) return null;
          try { return await getClass(authUserData.classId); }
          catch (e) { console.error('[dashboard] getClass failed:', e); return null; }
        })(),
      ]);

      const recentResults: ResultEntry[] = [];

      return {
        displayName, greeting, motivationalMessage: messages[messageIndex],
        todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        recentResults, subjectsCount: classDoc?.subjectIds?.length ?? 0,
        className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null,
        avgGrade: dashRes.averageScore ?? 0, totalAssessments: dashRes.totalAssessments ?? 0,
      } satisfies DashboardData;
    },
  });

  // Realtime: auto-refresh dashboard when new grades or corrections are added
  useRealtimeSubscription({
    table: 'grades',
    event: 'INSERT',
    filter: studentId ? { column: 'studentId', value: studentId } : undefined,
    callback: () => { refetch(); },
  });
  useRealtimeSubscription({
    table: 'corrections',
    event: 'INSERT',
    filter: studentId ? { column: 'studentId', value: studentId } : undefined,
    callback: () => { refetch(); },
  });
  useRealtimeSubscription({
    table: 'notifications',
    event: 'INSERT',
    filter: studentId ? { column: 'userId', value: studentId } : undefined,
    callback: () => { refetch(); },
  });

  const { data: adaptiveSummary } = useQuery({
    queryKey: ['adaptive-summary', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const res = await api.get(`/adaptive/student-summary/${studentId}`);
      return res.data.data as {
        proficiencyPercentage: number;
        needsRemediation: Array<{
          conceptId: string; title: string; masteryScore: number; attemptCount: number;
          textbookId: string;
          status: 'Needs Remediation' | 'In Progress' | 'Proficient';
          resources: Array<{ id: string; source: string; sourceLabel: string; title: string; url: string }>;
        }>;
        totalMastered: number;
        totalAttempted: number;
      };
    },
    refetchOnWindowFocus: true,
  });

  const [viewMindMapId, setViewMindMapId] = useState<string | null>(null);
  const { data: sharedMindMaps } = useQuery({
    queryKey: ['student-shared-mindmaps', studentId],
    enabled: !!studentId,
    queryFn: () => mindmapService.getSharedMindMaps(),
  });

  const { data: viewMindMapData } = useQuery({
    queryKey: ['mindmap-view', viewMindMapId],
    enabled: !!viewMindMapId,
    queryFn: () => mindmapService.getById(viewMindMapId!),
  });

  useRealtimeInvalidation([
    { table: 'grades', queryKey: ['student-dashboard', studentId ?? ''] },
    { table: 'corrections', queryKey: ['student-dashboard', studentId ?? ''] },
    { table: 'notifications', queryKey: ['student-dashboard', studentId ?? ''] },
  ]);

  return (
    <>
      <SEOHead title={_('Dashboard')} description={_('Your student dashboard')} />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="detail">
          {(dash) => (
            <div



              className="space-y-20"
            >
              <section>
                <div>
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-3">
                    {dash.todayDate}
                  </p>
                  <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight mb-2">
                    {dash.greeting}, {dash.displayName.split(' ')[0]}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {dash.className && (
                      <Badge variant="info" className="text-xs gap-1">
                        <Icon name="school" size={12} />{dash.className}{dash.classGrade ? ` (${_('Grade')} ${dash.classGrade})` : ''}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs italic">{dash.motivationalMessage}</Badge>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle label={_('Overview')} title={_('Your performance at a glance')} />
                <div




                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[
                    { icon: 'school', label: _('Subjects'), value: dash.subjectsCount, color: 'text-primary', bg: 'bg-primary-container' },
                    { icon: 'grade', label: _('Avg Grade'), value: `${dash.avgGrade}%`, color: 'text-success', bg: 'bg-success-container', isPerformanceLogo: true },
                    { icon: 'checklist', label: _('Completed'), value: dash.totalAssessments, color: 'text-warning', bg: 'bg-warning-container' },
                    { icon: 'group', label: _('Class'), value: dash.className ?? '\u2014', color: 'text-tertiary', bg: 'bg-tertiary-container' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <Card className="h-full border-border/60">
                        <CardContent className="p-5">
                          {stat.isPerformanceLogo ? (
                            <PerformanceLogoBadge className={`${stat.bg} mb-4`} />
                          ) : (
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg}`}>
                              <Icon name={stat.icon} size={22} className={stat.color} />
                            </div>
                          )}
                          <p className="text-display-xs font-bold tracking-tight">{stat.value}</p>
                          <p className="text-label-sm text-muted-foreground mt-1">{stat.label}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle label={_('Quick Links')} title={_('Navigate your studies')} />
                <div




                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {[
                    { icon: 'checklist', label: _('View Tasks'), desc: _('Pending assignments & quizzes'), bg: 'bg-primary-container', color: 'text-primary', to: ROUTES.STUDENT_TASKS },
                    { icon: 'fact_check', label: _('View Exams'), desc: _('Upcoming & past results'), bg: 'bg-error-container', color: 'text-error', to: ROUTES.STUDENT_EXAMS },
                  ].map((link) => (
                    <div key={link.label}>
                      <Button variant="outline" className="w-full h-auto py-5 justify-start gap-4 border-border/60" asChild>
                        <Link to={link.to}>
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${link.bg}`}>
                            <Icon name={link.icon} size={22} className={link.color} />
                          </div>
                          <div className="text-left">
                            <p className="text-title-sm font-bold">{link.label}</p>
                            <p className="text-label-sm text-muted-foreground">{link.desc}</p>
                          </div>
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {adaptiveSummary && (
                <section>
                  <SectionTitle label={_('Adaptive Learning')} title={_('Your learning status')} />
                  <div>
                    <Card className="border-border/60 mb-4">
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="text-center p-4 rounded-xl bg-primary-container/30">
                            <p className="text-display-xs font-bold text-primary">{adaptiveSummary.proficiencyPercentage}%</p>
                            <p className="text-label-sm text-muted-foreground mt-1">{_('Overall Proficiency')}</p>
                          </div>
                          <div className="text-center p-4 rounded-xl bg-success-container/30">
                            <p className="text-display-xs font-bold text-success">{adaptiveSummary.totalMastered}</p>
                            <p className="text-label-sm text-muted-foreground mt-1">{_('Mastered Concepts')}</p>
                          </div>
                          <div className="text-center p-4 rounded-xl bg-warning-container/30">
                            <p className="text-display-xs font-bold text-warning">{adaptiveSummary.totalAttempted - adaptiveSummary.totalMastered}</p>
                            <p className="text-label-sm text-muted-foreground mt-1">{_('Needs Review')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              )}

              {sharedMindMaps && sharedMindMaps.length > 0 && (
                <section>
                  <SectionTitle label={_('Resources')} title={_('Shared Mind Maps')} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sharedMindMaps.map((mm) => (
                      <div key={mm.id}>
                        <Card className="border-border/60 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setViewMindMapId(mm.id)}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                              <Icon name="psychology" size={20} className="text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-title-sm font-semibold truncate">{mm.title}</p>
                              {mm.subjectName && <Badge variant="secondary" className="text-[10px] mt-0.5">{mm.subjectName}</Badge>}
                              {mm.description && <p className="text-label-sm text-muted-foreground truncate">{mm.description}</p>}
                            </div>
                            <Icon name="chevron_right" size={18} className="text-muted-foreground shrink-0" />
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </section>
              )}



              <section>
                <SectionTitle label={_('Results')} title={_('Recent assessment scores')} />
                <div>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-title-sm flex items-center gap-2">
                        <Icon name="grade" size={18} />{_('Recent Results')}
                      </CardTitle>
                      {dash.recentResults.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{_('Last 5')}</Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {dash.recentResults.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                          <Icon name="rate_review" size={36} className="text-muted-foreground/30 mb-3" />
                          <p className="text-body-md text-muted-foreground">{_('No results yet. Complete assessments to see your grades here.')}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {dash.recentResults.map((result) => {
                            const colorClass = result.percentage >= 80
                              ? 'text-success bg-success-container/30'
                              : result.percentage >= 60
                              ? 'text-warning bg-warning-container/30'
                              : 'text-error bg-error-container/30';
                            return (
                              <div
                                key={result.id}
                              >
                                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-title-sm font-semibold truncate">{result.itemName}</p>
                                    <p className="text-label-sm text-muted-foreground">
                                      {result.score}/{result.maxScore}
                                      {result.feedback && <span className="ml-2 text-muted-foreground/60">&middot; {result.feedback}</span>}
                                    </p>
                                  </div>
                                  <div className={cn('h-9 min-w-[3rem] px-3 rounded-lg flex items-center justify-center text-label-sm font-bold', colorClass)}>
                                    {result.percentage}%
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          )}
        </DataFetchWrapper>
      </div>

      <Dialog open={!!viewMindMapId} onOpenChange={(o) => { if (!o) setViewMindMapId(null); }}>
        <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewMindMapData?.title || _('Mind Map')}</DialogTitle>
            {viewMindMapData?.description && <DialogDescription>{viewMindMapData.description}</DialogDescription>}
          </DialogHeader>
          {viewMindMapData && viewMindMapData.nodes && viewMindMapData.nodes.length > 0 ? (
            <div className="space-y-3 py-2">
              {viewMindMapData.nodes.map((n) => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
                  <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <Icon name="account_tree" size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-title-sm font-medium">{n.label}</p>
                    <p className="text-label-xs text-muted-foreground">
                      {n.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMindMapData ? (
            <p className="text-center text-muted-foreground py-8">{_('No nodes in this mind map.')}</p>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
