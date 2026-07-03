import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { getAllSubjects, getClass } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import api from '@/services/api';

interface V2Quiz {
  id: string;
  title: string;
  description?: string;
  classId: string;
  subjectId?: string;
  timeLimitMinutes: number;
  selectedModels: string[];
  totalPoints: number;
  passingScore: number;
  maxAttempts: number;
  releasedAt: string;
  createdAt: string;
  isRepublished?: boolean;
}

interface V2QuizWithMeta extends V2Quiz {
  subjectName: string;
  subjectColor?: string;
  subjectIcon?: string;
  myAttempts: number;
  bestPercentage: number | null;
  bestPassed: boolean | null;
}

export default function StudentQuizzesPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { _ } = useTranslation();
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-quizzes-v2', user?.id, user?.classId],
    queryFn: async () => {
      if (!user?.classId) return { quizzes: [] as V2QuizWithMeta[], subjects: [] as any[] };

      const [allSubjects, studentClass, quizzesRes, attemptsRes] = await Promise.all([
        getAllSubjects(),
        getClass(user.classId),
        api.get(`/quizzes-v2/class/${user.classId}`).then((r) => (r.data.data ?? []) as V2Quiz[]),
        api.get(`/quizzes-v2/attempts/my`).then((r) => (r.data.data ?? []) as any[]).catch(() => []),
      ]);

      const subjectIds = studentClass?.subjectIds ?? [];
      const subjects = allSubjects.filter((s) => subjectIds.includes(s.id));
      const subjectMap = new Map(subjects.map((s) => [s.id, s]));

      // Build attempt stats per quizId
      const attemptStats = new Map<string, { count: number; bestPct: number | null; bestPassed: boolean | null }>();
      for (const att of attemptsRes) {
        const existing = attemptStats.get(att.quizId) ?? { count: 0, bestPct: null, bestPassed: null };
        existing.count++;
        if (att.status === 'completed' && att.percentage != null) {
          if (existing.bestPct === null || att.percentage > existing.bestPct) {
            existing.bestPct = att.percentage;
            existing.bestPassed = att.passed ?? false;
          }
        }
        attemptStats.set(att.quizId, existing);
      }

      const quizzes: V2QuizWithMeta[] = quizzesRes.map((q) => {
        const subject = q.subjectId ? subjectMap.get(q.subjectId) : null;
        const stats = attemptStats.get(q.id);
        return {
          ...q,
          subjectName: subject?.name ?? 'General',
          subjectColor: subject?.color,
          subjectIcon: subject?.icon,
          myAttempts: stats?.count ?? 0,
          bestPercentage: stats?.bestPct ?? null,
          bestPassed: stats?.bestPassed ?? null,
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { quizzes, subjects };
    },
    enabled: !!user?.classId,
  });

  const filtered = selectedSubjectId
    ? (data?.quizzes ?? []).filter((q) => q.subjectId === selectedSubjectId)
    : (data?.quizzes ?? []);

  const pending = filtered.filter((q) => q.myAttempts === 0);
  const attempted = filtered.filter((q) => q.myAttempts > 0);

  return (
    <>
      <SEOHead title={_('Quizzes')} description={_('View and take your quizzes')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16">

        <motion.div>
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-headline-sm font-bold">{_('Quizzes')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Practice and test your knowledge')}</p>
            </div>
            {(data?.subjects?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button onClick={() => setSelectedSubjectId('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${selectedSubjectId === '' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface text-on-surface hover:bg-surface-variant/40 border-border/60'}`}>
                  <Icon name="select_all" size={14} />{_('All Subjects')}
                </button>
                {data!.subjects.map((sub: any) => {
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <button key={sub.id} onClick={() => setSelectedSubjectId(sub.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${isSelected ? 'text-white shadow-sm' : 'bg-surface text-on-surface hover:bg-surface-variant/40 border-border/60'}`}
                      style={isSelected ? { backgroundColor: sub.color || '#6366f1', borderColor: sub.color || '#6366f1' } : {}}>
                      <Icon name={sub.icon || 'menu_book'} size={14} style={!isSelected ? { color: sub.color } : undefined} />
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <DataFetchWrapper data={data} isLoading={isLoading}
          error={isError ? error ?? new Error(_('Failed to load quizzes')) : null}
          loadingType="list" onRetry={() => refetch()} errorTitle={_('Failed to load quizzes')}
          emptyMessage={_('No quizzes available yet')} emptyIcon={<Icon name="quiz" size={40} />}>
          {() => (
            <div className="space-y-16">
              {/* Pending quizzes */}
              {pending.length > 0 && (
                <section>
                  <div className="mb-6">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('PENDING')}</p>
                    <h2 className="text-headline-sm font-bold flex items-center gap-2">
                      {_('New Quizzes')}
                      <Badge variant="destructive" className="text-xs">{pending.length}</Badge>
                    </h2>
                  </div>
                  <motion.div className="space-y-3">
                    {pending.filter(Boolean).map((quiz: any) => (
                      <motion.div key={quiz.id}>
                        <Card className="border-border/60 hover:border-primary/30 transition-all group cursor-pointer"
                          onClick={() => navigate(ROUTES.STUDENT_TAKE_ASSESSMENT(quiz.id))}>
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${quiz.subjectColor || '#6366f1'}20` }}>
                                <Icon name={quiz.subjectIcon || 'quiz'} size={24}
                                  style={{ color: quiz.subjectColor || '#6366f1' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold">{quiz.title}</p>
                                  {quiz.isRepublished && (
                                    <Badge variant="success" className="text-[10px]">{_('Practice Mode')}</Badge>
                                  )}
                                </div>
                                <p className="text-body-sm text-muted-foreground mt-0.5">{quiz.subjectName}</p>
                                <div className="flex items-center gap-3 mt-2 text-label-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1"><Icon name="timer" size={12} />{quiz.timeLimitMinutes}m</span>
                                  <span className="flex items-center gap-1"><Icon name="star" size={12} />{quiz.totalPoints} {_('pts')}</span>
                                  <span className="flex items-center gap-1"><Icon name="replay" size={12} />{_('Max')} {quiz.maxAttempts}</span>
                                  {(quiz.selectedModels?.length ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[10px]">
                                      {quiz.selectedModels.slice(0, 3).join(', ')}{quiz.selectedModels.length > 3 ? ` +${quiz.selectedModels.length - 3}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" className="shrink-0">{_('Start')}</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}

              {/* Attempted quizzes */}
              {attempted.length > 0 && (
                <section>
                  <div className="mb-6">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('HISTORY')}</p>
                    <h2 className="text-headline-sm font-bold">{_('Attempted')}</h2>
                  </div>
                  <motion.div className="space-y-3">
                    {attempted.filter(Boolean).map((quiz: any) => (
                      <motion.div key={quiz.id}>
                        <Card className="border-border/60 hover:border-primary/20 transition-all cursor-pointer"
                          onClick={() => navigate(ROUTES.STUDENT_TAKE_ASSESSMENT(quiz.id))}>
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${quiz.bestPassed ? 'bg-success-container' : quiz.bestPassed === false ? 'bg-error-container' : 'bg-muted'}`}>
                                <Icon name={quiz.bestPassed ? 'check_circle' : quiz.bestPassed === false ? 'cancel' : 'quiz'} size={24}
                                  className={quiz.bestPassed ? 'text-success' : quiz.bestPassed === false ? 'text-error' : 'text-muted-foreground'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold">{quiz.title}</p>
                                  {quiz.bestPercentage !== null && (
                                    <Badge variant={quiz.bestPassed ? 'success' : 'destructive'} className="text-xs shrink-0">
                                      {_('Best')}: {quiz.bestPercentage}%
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-body-sm text-muted-foreground mt-0.5">{quiz.subjectName}</p>
                                <div className="flex items-center gap-3 mt-2 text-label-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Icon name="history" size={12} />{quiz.myAttempts} {quiz.myAttempts !== 1 ? _('attempts') : _('attempt')}</span>
                                  {quiz.myAttempts < quiz.maxAttempts && (
                                    <span className="flex items-center gap-1 text-primary"><Icon name="replay" size={12} />{quiz.maxAttempts - quiz.myAttempts} {_('left')}</span>
                                  )}
                                </div>
                              </div>
                              {quiz.myAttempts < quiz.maxAttempts && (
                                <Button size="sm" variant="outline" className="shrink-0">{_('Retry')}</Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </section>
              )}

              {filtered.length === 0 && (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center gap-3 py-16">
                    <Icon name="quiz" size={48} className="text-muted-foreground/30" />
                    <p className="text-title-sm font-semibold">{_('No quizzes yet')}</p>
                    <p className="text-body-md text-muted-foreground text-center">{_("Your teacher hasn't pushed any quizzes yet. Check back later.")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
