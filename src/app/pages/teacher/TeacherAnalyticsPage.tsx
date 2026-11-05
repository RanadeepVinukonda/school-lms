import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon name={icon} size={24} className="text-white" />
        </div>
        <div>
          <p className="text-display-xs font-bold">{value}</p>
          <p className="text-label-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentRow({ assessment }: { assessment: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon
            name={assessment.type === 'quiz' ? 'quiz' : assessment.type === 'exam' ? 'assignment' : 'checklist'}
            size={18}
            className="text-muted-foreground"
          />
          <div>
            <p className="font-medium text-sm">{assessment.title}</p>
            <p className="text-label-xs text-muted-foreground capitalize">{assessment.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold">{assessment.avgScore ?? 0}%</p>
            <p className="text-label-xs text-muted-foreground">Avg</p>
          </div>
          <Badge variant={assessment.released ? 'default' : 'outline'}>
            {assessment.released ? 'Released' : 'Draft'}
          </Badge>
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} className="text-muted-foreground" />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-label-xs text-muted-foreground">Pass Rate</p>
              <p className="font-semibold">{assessment.passRate ?? 0}%</p>
            </div>
            <div>
              <p className="text-label-xs text-muted-foreground">Attempts</p>
              <p className="font-semibold">{assessment.attemptCount}</p>
            </div>
            <div>
              <p className="text-label-xs text-muted-foreground">Status</p>
              <p className="font-semibold">{assessment.released ? 'Live' : 'Pending'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: classData, isLoading, error, refetch } = useQuery({
    queryKey: ['class-analytics', selectedClassId],
    queryFn: () => api.get(`/analytics-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId && activeTab === 'overview',
  });

  const { data: conceptMastery, isLoading: masteryLoading, error: masteryError } = useQuery({
    queryKey: ['concept-mastery', selectedClassId],
    queryFn: () => api.get(`/analytics-v2/class/${selectedClassId}/concepts`).then((r) => r.data.data),
    enabled: !!selectedClassId && activeTab === 'concepts',
  });

  const classes = [...new Map((assignments ?? []).map((a: any) => [a.classId, { id: a.classId, name: a.className }])).values()] as any[];

  const levelColors: Record<string, string> = { beginner: 'bg-blue-500', intermediate: 'bg-amber-500', advanced: 'bg-emerald-500' };

  return (
    <>
      <SEOHead title={_('Analytics')} description={_('Class performance analytics')} canonical="/teacher/analytics" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-headline-sm">{_('Analytics')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Class performance and student insights')}</p>
            </div>
            {classes.length > 0 && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">{_('Select a class...')}</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </motion.div>

        {!selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center text-muted-foreground">
                <Icon name="analytics" size={48} className="mx-auto mb-3 opacity-40" />
                <p>{_('Select a class to view analytics')}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedClassId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <motion.div variants={cardStackReveal} custom={0}>
              <TabsList className="w-full overflow-x-auto inline-flex">
                <TabsTrigger value="overview">{_('Overview')}</TabsTrigger>
                <TabsTrigger value="concepts">{_('Concept Mastery')}</TabsTrigger>
              </TabsList>
            </motion.div>

            <TabsContent value="overview">
              <DataFetchWrapper data={classData} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
                {(data) => <div className="space-y-16">
                  <motion.div variants={cardStackReveal} custom={0}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <StatCard icon="school" label={_('Students')} value={data.totalStudents ?? 0} color="bg-blue-600" />
                      <StatCard icon="quiz" label={_('Assessments')} value={data.totalAssessments ?? 0} color="bg-purple-600" />
                      <StatCard icon="trending_up" label={_('Avg Score')} value={`${data.avgScore ?? 0}%`} color="bg-emerald-600" />
                      <StatCard icon="check_circle" label={_('Pass Rate')} value={`${data.passRate ?? 0}%`} color="bg-amber-600" />
                    </div>
                  </motion.div>

                  {data.studentLevelDistribution && (
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardHeader><CardTitle className="text-title-sm">{_('Student Level Distribution')}</CardTitle></CardHeader>
                        <CardContent className="p-5 space-y-3">
                          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <div key={level} className="flex items-center gap-3">
                              <span className="text-label-sm w-24 capitalize">{level}</span>
                              <Progress
                                value={data.totalStudents > 0 ? (data.studentLevelDistribution[level] / data.totalStudents) * 100 : 0}
                                className={levelColors[level]}
                              />
                              <span className="text-sm font-semibold w-8 text-right">{data.studentLevelDistribution[level]}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {data.assessments && data.assessments.length > 0 ? (
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardHeader><CardTitle className="text-title-sm">{_('Assessments')} ({data.assessments.length})</CardTitle></CardHeader>
                        <CardContent className="p-5 space-y-2">
                          {data.assessments.map((a: any, i: number) => (
                            <AssessmentRow key={i} assessment={a} />
                          ))}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardContent className="p-5 text-center text-muted-foreground">
                          <p>{_('No assessments found for this class')}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>}
              </DataFetchWrapper>
            </TabsContent>

            <TabsContent value="concepts">
              <DataFetchWrapper data={conceptMastery} isLoading={masteryLoading} error={masteryError} loadingType="card">
                {(data) => {
                  const concepts: any[] = Array.isArray(data) ? data : [];
                  if (concepts.length === 0) return (
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60"><CardContent className="p-5 text-center text-muted-foreground"><p>{_('No concept data available. Create assessments linked to concepts to see mastery here.')}</p></CardContent></Card>
                    </motion.div>
                  );
                  return (
                    <div className="space-y-2">
                      {concepts.map((c: any, i: number) => (
                        <motion.div key={i} variants={cardStackReveal} custom={i}>
                          <Card className="border-border/60">
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{c.conceptName}</p>
                                  <p className="text-label-xs text-muted-foreground">{c.subjectName} &middot; {c.className}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={`text-lg font-bold ${(c.averageScore ?? 0) >= 80 ? 'text-success' : (c.averageScore ?? 0) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                                    {c.averageScore ?? 0}%
                                  </p>
                                  <p className="text-label-xs text-muted-foreground">{c.attemptCount} attempts</p>
                                </div>
                              </div>
                              <Progress
                                value={c.averageScore ?? 0}
                                className={`h-1.5 mt-2 ${(c.averageScore ?? 0) >= 80 ? 'bg-emerald-500' : (c.averageScore ?? 0) >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                              />
                              {c.status === 'low' && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                                  <Icon name="warning" size={14} />
                                  <span>{_('Below threshold')} ({c.threshold}%) &mdash; {_('flagged for attention')}</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  );
                }}
              </DataFetchWrapper>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </>
  );
}
