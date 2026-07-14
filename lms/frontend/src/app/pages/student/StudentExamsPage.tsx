import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { getAllSubjects, getClass, getExamsBySubject, getCorrectionsByStudent } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import type { ExamItem, CorrectionItem } from '@/services/dataService';

function Countdown({ endDate }: { endDate: string }) {
  const { _ } = useTranslation();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setRemaining(_('Started'));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setRemaining(`${days}${_('d')} ${hours}${_('h')} ${_('remaining')}`);
      } else if (hours > 0) {
        setRemaining(`${hours}${_('h')} ${minutes}${_('m')} ${_('remaining')}`);
      } else {
        setRemaining(`${minutes}${_('m')} ${_('remaining')}`);
      }
    }

    calculate();
    const interval = setInterval(calculate, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return <span className="text-xs font-medium">{remaining}</span>;
}

interface ExamWithSubject extends ExamItem {
  subject: { id: string; name: string; code?: string; icon?: string; color?: string; category?: string } | null;
}

interface PastExamResult extends ExamWithSubject {
  correction: CorrectionItem | null;
  percentage: number | null;
}

export default function StudentExamsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-exams', user?.id, user?.classId],
    queryFn: async () => {
      if (!user?.classId) return { upcoming: [], past: [], subjects: [] };
      const [allSubjects, studentClass, corrections] = await Promise.all([
        getAllSubjects(),
        getClass(user.classId),
        user?.id ? getCorrectionsByStudent(user.id) : Promise.resolve([]),
      ]);

      if (!studentClass || !studentClass.subjectIds || studentClass.subjectIds.length === 0) {
        return { upcoming: [], past: [], subjects: [] };
      }

      const subjects = allSubjects.filter((s) => studentClass.subjectIds!.includes(s.id));
      const examPromises = subjects.map((s) => getExamsBySubject(s.id));
      const examResults = await Promise.all(examPromises);
      const allExams = examResults.flat();

      const now = new Date();
      const upcoming: ExamWithSubject[] = [];
      const past: PastExamResult[] = [];

      for (const exam of allExams) {
        const subject = subjects.find((s) => s.id === exam.subjectId) ?? null;
        const subjectData = subject
          ? { id: subject.id, name: subject.name, code: subject.code, icon: subject.icon, color: subject.color, category: subject.category }
          : null;

        const examEnd = exam.endDate ? new Date(exam.endDate) : null;
        const examStart = exam.startDate ? new Date(exam.startDate) : null;

        if (examEnd && examEnd < now) {
          const correction = corrections.find((c) => c.examId === exam.id) ?? null;
          const maxPoints = Array.isArray(exam.questions)
            ? (exam.questions as Array<{ points?: number }>).reduce((s, q) => s + (q.points ?? 0), 0)
            : 0;
          const percentage = correction && maxPoints > 0
            ? Math.round((correction.totalMarks ?? 0) / maxPoints * 100)
            : null;

          past.push({ ...exam, subject: subjectData, correction, percentage });
        } else if (examStart && examStart > now) {
          upcoming.push({ ...exam, subject: subjectData });
        }
      }

      const uniqueSubjects = subjects.filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
      return { upcoming, past, subjects: uniqueSubjects };
    },
    enabled: !!user,
  });

  // Realtime: auto-refresh when new corrections are published
  useRealtimeSubscription({
    table: 'corrections',
    event: 'INSERT',
    filter: user?.id ? { column: 'studentId', value: user.id } : undefined,
    callback: () => { refetch(); },
  });

  useRealtimeInvalidation([{ table: 'exams', queryKey: ['student-exams', user?.id ?? '', user?.classId ?? ''] }]);

  return (
    <>
      <SEOHead title={_('Exams')} description={_('View upcoming and past exam results')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-headline-sm font-bold">{_('Exams')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Track upcoming exams and past results')}</p>
            </div>
            {data?.subjects && data.subjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedSubjectId('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedSubjectId === ''
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-on-surface hover:bg-surface-variant/40 border-border/60"
                  }`}
                >
                  <Icon name="select_all" size={14} />
                  {_('All Subjects')}
                </button>
                {data.subjects.map((sub: any) => {
                  const isSelected = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? "text-white shadow-sm"
                          : "bg-surface text-on-surface hover:bg-surface-variant/40 border-border/60"
                      }`}
                      style={isSelected ? { backgroundColor: sub.color || '#6366f1', borderColor: sub.color || '#6366f1' } : {}}
                    >
                      <Icon name={sub.icon || 'menu_book'} size={14} style={!isSelected ? { color: sub.color } : undefined} />
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error(_('Failed to load exams')) : null}
          loadingType="list"
          onRetry={() => refetch()}
          errorTitle={_('Failed to load exams')}
        >
          {(d) => {
            const filteredUpcoming = selectedSubjectId
              ? d.upcoming.filter((exam) => exam.subjectId === selectedSubjectId)
              : d.upcoming;
            const filteredPast = selectedSubjectId
              ? d.past.filter((exam) => exam.subjectId === selectedSubjectId)
              : d.past;

            return (
              <div className="space-y-16">
                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <div className="mb-6">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('SCHEDULED')}</p>
                    <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Upcoming Exams')}</h2>
                  </div>
                  {filteredUpcoming.length === 0 ? (
                    <Card className="border-border/60">
                      <CardContent className="flex flex-col items-center gap-3 py-10">
                        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
                        <p className="text-body-md text-muted-foreground">{_('No upcoming exams scheduled')}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: '-60px' }}
                      className="space-y-3"
                    >
                      {filteredUpcoming.map((exam) => (
                        <motion.div key={exam.id} variants={cardStackReveal} custom={0}>
                          <Link to={`/exams/${exam.id}`}>
                            <Card className="border-border/60 transition-all duration-300 group">
                              <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-error-container flex items-center justify-center flex-shrink-0">
                                    <Icon name="fact_check" size={24} className="text-error" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold truncate">{exam.title}</p>
                                      <Badge
                                        variant="info"
                                        className="text-[10px] flex-shrink-0"
                                      >
                                        <Icon name="schedule" size={12} className="mr-1" />
                                        {exam.startDate && <Countdown endDate={exam.startDate} />}
                                      </Badge>
                                    </div>
                                    <p className="text-body-sm text-muted-foreground mt-0.5">
                                      {exam.subject?.name ?? _('Unknown Subject')}
                                    </p>
                                    <p className="text-body-sm text-muted-foreground mt-1 line-clamp-1">
                                      {exam.description}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-body-sm text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Icon name="schedule" size={14} />
                                        {exam.duration} {_('min')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="quiz" size={14} />
                                        {Array.isArray(exam.questions) ? exam.questions.length : 0} {_('questions')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="calendar_today" size={14} />
                                        {exam.startDate ? formatDate(exam.startDate) : _('N/A')}
                                      </span>
                                    </div>
                                  </div>
                                  <Icon
                                    name="chevron_right"
                                    size={20}
                                    className="text-muted-foreground flex-shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
                  <div className="mb-6">
                    <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{_('HISTORY')}</p>
                    <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Past Results')}</h2>
                  </div>
                  {filteredPast.length === 0 ? (
                    <Card className="border-border/60">
                      <CardContent className="flex flex-col items-center gap-3 py-10">
                        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
                        <p className="text-body-md text-muted-foreground">{_('No past exam results yet')}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: '-60px' }}
                      className="space-y-3"
                    >
                      {filteredPast.map((exam) => (
                        <motion.div key={exam.id} variants={cardStackReveal} custom={0}>
                          {exam.correction ? (
                            <Card className="border-border/60 transition-all duration-300 group">
                              <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-success-container flex items-center justify-center flex-shrink-0">
                                    <Icon name="check_circle" size={24} className="text-success" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold truncate">{exam.title}</p>
                                      <Badge
                                        variant={
                                          (exam.percentage ?? 0) >= 80
                                            ? 'success'
                                            : (exam.percentage ?? 0) >= 60
                                              ? 'warning'
                                              : 'destructive'
                                        }
                                        className="text-xs flex-shrink-0"
                                      >
                                        {exam.percentage}% - {getLetterGrade(exam.percentage ?? 0)}
                                      </Badge>
                                    </div>
                                    <p className="text-body-sm text-muted-foreground mt-0.5">
                                      {exam.subject?.name ?? _('Unknown Subject')}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-body-sm text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Icon name="grade" size={14} />
                                        {exam.correction.totalMarks}/{Array.isArray(exam.questions)
                                          ? (exam.questions as Array<{ points?: number }>).reduce((s, q) => s + (q.points ?? 0), 0)
                                          : 0}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="calendar_today" size={14} />
                                        {exam.correction.correctedAt ? formatDate(exam.correction.correctedAt) : _('N/A')}
                                      </span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {exam.correction.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Icon
                                    name="chevron_right"
                                    size={20}
                                    className="text-muted-foreground flex-shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <Card className="border-border/60 opacity-70">
                              <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                    <Icon name="fact_check" size={24} className="text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{exam.title}</p>
                                    <p className="text-body-sm text-muted-foreground mt-0.5">
                                      {exam.subject?.name ?? _('Unknown Subject')}
                                    </p>
                                    <p className="text-body-sm text-muted-foreground mt-1">
                                      {_('Taken on')} {exam.endDate ? formatDate(exam.endDate) : _('N/A')} &middot; {_('Results pending')}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                    {_('Pending')}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              </div>
            );
          }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
