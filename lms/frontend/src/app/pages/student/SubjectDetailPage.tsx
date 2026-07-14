import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { getTextbooksBySubject, getChaptersForTextbook } from '@/services/textbookService';
import { getSubject, getGradesByStudent } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { Textbook } from '@/types/textbook';

interface DashboardData {
  subject: NonNullable<Awaited<ReturnType<typeof getSubject>>>;
  currentChapter: { textbookId: string; textbookTitle: string; id: string; title: string; order: number; conceptCount: number } | null;
  recentGrade: { itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string } | null;
  textbooks: Array<Textbook & { chapterCount: number }>;
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const authUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData | null>({
    queryKey: ['subject-detail', id, authUser?.id],
    queryFn: async () => {
      if (!id) return null;
      const studentId = authUser?.id;
      if (!studentId) return null;

      const [subject, firestoreTextbooks, grades] = await Promise.all([
        getSubject(id),
        getTextbooksBySubject(id),
        studentId ? getGradesByStudent(studentId) : Promise.resolve([]),
      ]);

      if (!subject) return null;

      const textbooks = firestoreTextbooks
        .filter((tb) => tb.status !== 'processing' && (!authUser?.classId || tb.classId === authUser.classId))
        .map((tb) => ({ ...tb, chapterCount: tb.chapterCount ?? 0 }));
      const firstTb = textbooks[0];
      let currentChapter: { textbookId: string; textbookTitle: string; id: string; title: string; order: number; conceptCount: number } | null = null;
      if (firstTb) {
        const chapters = await getChaptersForTextbook(firstTb.id);
        const firstCh = chapters[0];
        if (firstCh) {
          currentChapter = {
            textbookId: firstTb.id,
            textbookTitle: firstTb.title,
            id: firstCh.id,
            title: firstCh.title,
            order: firstCh.order as number,
            conceptCount: 0,
          };
        }
      }
      const recentGrade = grades
        .filter((g) => g.subjectId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

      return {
        subject,
        currentChapter,
        recentGrade: recentGrade ? { itemName: recentGrade.itemName ?? 'Assessment', score: recentGrade.score, maxScore: recentGrade.totalPoints, percentage: recentGrade.percentage, gradedAt: recentGrade.createdAt } : null,
        textbooks,
      };
    },
    enabled: !!id && !!authUser?.id,
  });

  return (
    <>
      <SEOHead title={data?.subject?.name ?? 'Subject'} description={`${data?.subject?.name ?? 'Subject'} overview`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <Button variant="ghost" size="sm" asChild className="mb-1">
            <Link to={ROUTES.STUDENT_SUBJECTS} className="gap-2">
              <Icon name="arrow_back" size={16} /> Back to Subjects
            </Link>
          </Button>
        </motion.div>
        <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? error ?? new Error('Failed to load subject') : null}
          loadingType="detail" emptyMessage="Subject not found" emptyIcon={<Icon name="menu_book" size={32} />}
          emptyAction={<Button asChild><Link to={ROUTES.STUDENT_SUBJECTS}><Icon name="arrow_back" size={16} className="mr-2" /> Back to Subjects</Link></Button>}
          onRetry={() => refetch()} errorTitle="Failed to load subject"
        >
          {(d) => (
            <div className="space-y-16">
              {/* Banner */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <Card className="overflow-hidden border-0">
                  <div className="relative p-6 pb-12" style={{ background: `linear-gradient(135deg, ${d.subject.color}33 0%, transparent 100%)` }}>
                    <div className="absolute inset-0" style={{ backgroundColor: d.subject.color, opacity: 0.06 }} />
                    <div className="relative z-10 flex items-start gap-5">
                      <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: d.subject.color }}>
                        <Icon name={d.subject.icon ?? 'school'} size={32} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight" style={{ color: d.subject.color }}>{d.subject.name}</h1>
                        <p className="text-body-md text-muted-foreground">{d.subject.code}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {d.subject.category && <Badge variant="secondary" className="text-[10px]">{d.subject.category}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Info grid */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <div className="mb-6">
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">OVERVIEW</p>
                  <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">Quick Stats</h2>
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="overflow-hidden border-border/60">
                      <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                      <CardContent className="p-5">
                        <p className="text-label-sm font-medium flex items-center gap-2 mb-2"><Icon name="auto_stories" size={16} className="text-muted-foreground" /> Current Chapter</p>
                        {d.currentChapter ? (
                          <Link to={ROUTES.STUDENT_TEXTBOOK(d.currentChapter.textbookId)} className="block group">
                            <p className="font-semibold group-hover:underline truncate">{d.currentChapter.title}</p>
                            <p className="text-body-sm text-muted-foreground">{d.currentChapter.textbookTitle}</p>
                          </Link>
                        ) : <p className="text-body-sm text-muted-foreground">No chapters yet</p>}
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardStackReveal} custom={1}>
                    <Card className="overflow-hidden border-border/60">
                      <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                      <CardContent className="p-5">
                        <p className="text-label-sm font-medium flex items-center gap-2 mb-2"><Icon name="auto_stories" size={16} className="text-muted-foreground" /> Textbooks</p>
                        <p className="font-semibold text-title-md">{d.textbooks.length} available</p>
                        <p className="text-body-sm text-muted-foreground">{d.textbooks.reduce((s, t) => s + t.chapterCount, 0)} total chapters</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardStackReveal} custom={2}>
                    <Card className="overflow-hidden border-border/60">
                      <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                      <CardContent className="p-5">
                        <p className="text-label-sm font-medium flex items-center gap-2 mb-2"><Icon name="assignment" size={16} className="text-muted-foreground" /> Upcoming Assignment</p>
                        <p className="text-body-sm text-muted-foreground">No pending assignments</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardStackReveal} custom={3}>
                    <Card className="overflow-hidden border-border/60">
                      <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                      <CardContent className="p-5">
                        <p className="text-label-sm font-medium flex items-center gap-2 mb-2"><Icon name="fact_check" size={16} className="text-muted-foreground" /> Upcoming Exam</p>
                        <p className="text-body-sm text-muted-foreground">No exams scheduled</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={cardStackReveal} custom={4}>
                    <Card className="overflow-hidden border-border/60 sm:col-span-2">
                      <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                      <CardContent className="p-5">
                        <p className="text-label-sm font-medium flex items-center gap-2 mb-2"><Icon name="grading" size={16} className="text-muted-foreground" /> Recent Grade</p>
                        {d.recentGrade ? (
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{d.recentGrade.itemName}</p>
                              <p className="text-body-xs text-muted-foreground">{new Date(d.recentGrade.gradedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-lg font-bold" style={{ color: d.recentGrade.percentage >= 70 ? '#16a34a' : '#dc2626' }}>
                                {d.recentGrade.score}/{d.recentGrade.maxScore}
                              </p>
                              <p className="text-body-xs text-muted-foreground">{d.recentGrade.percentage}%</p>
                            </div>
                          </div>
                        ) : <p className="text-body-sm text-muted-foreground">No grades yet</p>}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Textbooks section */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <div className="mb-6">
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">MATERIALS</p>
                  <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">Textbooks</h2>
                </div>
                {d.textbooks.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="flex flex-col items-center gap-3 py-10">
                      <Icon name="auto_stories" size={40} className="text-muted-foreground/50" />
                      <p className="text-body-md text-muted-foreground">No textbooks available yet for this subject.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {d.textbooks.map((tb, idx) => (
                      <motion.div key={tb.id} variants={cardStackReveal} custom={idx}>
                        <Link to={ROUTES.STUDENT_TEXTBOOK(tb.id)} className="block h-full">
                          <Card className="h-full border-border/60 hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                            <div className="h-2" style={{ backgroundColor: d.subject.color }} />
                            <CardContent className="p-5 flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: `${d.subject.color}18` }}>
                                  <Icon name="auto_stories" size={24} style={{ color: d.subject.color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate">{tb.title}</p>
                                  <p className="text-body-sm text-muted-foreground">{d.subject.code}</p>
                                </div>
                              </div>
                              {tb.description && <p className="text-body-sm text-muted-foreground line-clamp-2">{tb.description}</p>}
                              <p className="text-body-sm text-muted-foreground flex items-center gap-1">
                                <Icon name="auto_stories" size={14} /> {tb.chapterCount} {tb.chapterCount === 1 ? 'chapter' : 'chapters'}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Quick actions */}
              <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                <div className="flex flex-wrap gap-3">
                  {d.textbooks.length > 0 && (
                    <Button variant="outline" asChild className="gap-2">
                      <Link to={ROUTES.STUDENT_TEXTBOOK(d.textbooks[0].id)}><Icon name="menu_book" size={18} /> View Textbooks</Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
