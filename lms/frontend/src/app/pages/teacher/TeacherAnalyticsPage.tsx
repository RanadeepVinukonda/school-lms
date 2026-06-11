import { useState } from 'react';
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
import { pageTransition } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon name={icon} size={20} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentRow({ assessment }: { assessment: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
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
            <p className="text-xs text-muted-foreground capitalize">{assessment.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-semibold">{assessment.avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg</p>
          </div>
          <Badge variant={assessment.released ? 'default' : 'outline'}>
            {assessment.released ? 'Released' : 'Draft'}
          </Badge>
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} className="text-muted-foreground" />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Pass Rate</p>
              <p className="font-semibold">{assessment.passRate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attempts</p>
              <p className="font-semibold">{assessment.attemptCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold">{assessment.released ? 'Live' : 'Pending'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: classData, isLoading, error, refetch } = useQuery({
    queryKey: ['class-analytics', selectedClassId],
    queryFn: () => api.get(`/analytics-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId,
  });

  const classes = [...new Map((assignments ?? []).map((a: any) => [a.classId, { id: a.classId, name: a.className }])).values()] as any[];

  const levelColors: Record<string, string> = { beginner: 'bg-blue-500', intermediate: 'bg-amber-500', advanced: 'bg-emerald-500' };

  return (
    <>
      <SEOHead title="Analytics" description="Class performance analytics" canonical="/teacher/analytics" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Analytics</h1>
            <p className="text-sm text-muted-foreground">Class performance and student insights</p>
          </div>
          {classes.length > 0 && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="">Select a class...</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {!selectedClassId && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Icon name="analytics" size={48} className="mx-auto mb-3 opacity-40" />
              <p>Select a class to view analytics</p>
            </CardContent>
          </Card>
        )}

        {selectedClassId && (
          <DataFetchWrapper data={classData} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
            {(data) => <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon="school" label="Students" value={data.totalStudents ?? 0} color="bg-blue-600" />
                <StatCard icon="quiz" label="Assessments" value={data.totalAssessments ?? 0} color="bg-purple-600" />
                <StatCard icon="trending_up" label="Avg Score" value={`${data.avgScore ?? 0}%`} color="bg-emerald-600" />
                <StatCard icon="check_circle" label="Pass Rate" value={`${data.passRate ?? 0}%`} color="bg-amber-600" />
              </div>

              {data.studentLevelDistribution && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Student Level Distribution</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <div key={level} className="flex items-center gap-3">
                        <span className="text-sm w-24 capitalize">{level}</span>
                        <Progress
                          value={data.totalStudents > 0 ? (data.studentLevelDistribution[level] / data.totalStudents) * 100 : 0}
                          className={levelColors[level]}
                        />
                        <span className="text-sm font-semibold w-8 text-right">{data.studentLevelDistribution[level]}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {data.assessments && data.assessments.length > 0 ? (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Assessments ({data.assessments.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {data.assessments.map((a: any, i: number) => (
                      <AssessmentRow key={i} assessment={a} />
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No assessments found for this class</p>
                  </CardContent>
                </Card>
              )}
            </div>}
          </DataFetchWrapper>
        )}
      </motion.div>
    </>
  );
}
