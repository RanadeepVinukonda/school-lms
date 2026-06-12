import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { getAllSubjects, getExamsBySubject, getCorrectionsByStudent } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import type { ExamItem, CorrectionItem } from '@/services/dataService';

function Countdown({ endDate }: { endDate: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setRemaining('Started');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setRemaining(`${minutes}m remaining`);
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
  const studentId = useAuthStore((s) => s.user?.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-exams', studentId],
    queryFn: async () => {
      const [allSubjects, corrections] = await Promise.all([
        getAllSubjects(),
        studentId ? getCorrectionsByStudent(studentId) : Promise.resolve([]),
      ]);

      // Get all exams by subject
      const subjectIds = allSubjects.map((s) => s.id);
      const examPromises = subjectIds.map((sid) => getExamsBySubject(sid));
      const examResults = await Promise.all(examPromises);
      const allExams = examResults.flat();

      const now = new Date();
      const upcoming: ExamWithSubject[] = [];
      const past: PastExamResult[] = [];

      for (const exam of allExams) {
        const subject = allSubjects.find((s) => s.id === exam.subjectId) ?? null;
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

      return { upcoming, past, subjects: allSubjects };
    },
    enabled: !!studentId,
  });

  return (
    <>
      <SEOHead title="Exams" description="View upcoming and past exam results" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-6 pb-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm font-bold">Exams</h1>
            <p className="text-body-md text-muted-foreground">Track upcoming exams and past results</p>
          </div>
          {data?.subjects && data.subjects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter Subject:</span>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Subjects</option>
                {data.subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load exams') : null}
          loadingType="list"
          onRetry={() => refetch()}
          errorTitle="Failed to load exams"
        >
          {(d) => {
            const filteredUpcoming = selectedSubjectId
              ? d.upcoming.filter((exam) => exam.subjectId === selectedSubjectId)
              : d.upcoming;
            const filteredPast = selectedSubjectId
              ? d.past.filter((exam) => exam.subjectId === selectedSubjectId)
              : d.past;

            return (
              <>
                <motion.section variants={listItem} initial="hidden" animate="show">
                  <h2 className="text-title-sm font-semibold mb-3 flex items-center gap-2">
                    <Icon name="calendar_month" size={20} className="text-primary" />
                    Upcoming Exams
                  </h2>
                  {filteredUpcoming.length === 0 ? (
                    <Card variant="elevated">
                      <CardContent className="flex flex-col items-center gap-3 py-10">
                        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
                        <p className="text-body-md text-muted-foreground">No upcoming exams scheduled</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {filteredUpcoming.map((exam) => (
                        <motion.div key={exam.id} variants={listItem}>
                          <Link to={`/exams/${exam.id}`}>
                            <Card variant="elevated" className="transition-all duration-300 group">
                              <CardContent className="p-4">
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
                                      {exam.subject?.name ?? 'Unknown Subject'}
                                    </p>
                                    <p className="text-body-sm text-muted-foreground mt-1 line-clamp-1">
                                      {exam.description}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-body-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Icon name="schedule" size={14} />
                                        {exam.duration} min
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="quiz" size={14} />
                                        {Array.isArray(exam.questions) ? exam.questions.length : 0} questions
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="calendar_today" size={14} />
                                        {exam.startDate ? formatDate(exam.startDate) : 'N/A'}
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
                </motion.section>

                <motion.section variants={listItem} initial="hidden" animate="show">
                  <h2 className="text-title-sm font-semibold mb-3 flex items-center gap-2">
                    <Icon name="history" size={20} className="text-muted-foreground" />
                    Past Results
                  </h2>
                  {filteredPast.length === 0 ? (
                    <Card variant="elevated">
                      <CardContent className="flex flex-col items-center gap-3 py-10">
                        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
                        <p className="text-body-md text-muted-foreground">No past exam results yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {filteredPast.map((exam) => (
                        <motion.div key={exam.id} variants={listItem}>
                          {exam.correction ? (
                            <Card variant="elevated" className="transition-all duration-300 group">
                              <CardContent className="p-4">
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
                                      {exam.subject?.name ?? 'Unknown Subject'}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-body-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Icon name="grade" size={14} />
                                        {exam.correction.totalMarks}/{Array.isArray(exam.questions)
                                          ? (exam.questions as Array<{ points?: number }>).reduce((s, q) => s + (q.points ?? 0), 0)
                                          : 0}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="calendar_today" size={14} />
                                        {exam.correction.correctedAt ? formatDate(exam.correction.correctedAt) : 'N/A'}
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
                            <Card variant="elevated" className="opacity-70">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                    <Icon name="fact_check" size={24} className="text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{exam.title}</p>
                                    <p className="text-body-sm text-muted-foreground mt-0.5">
                                      {exam.subject?.name ?? 'Unknown Subject'}
                                    </p>
                                    <p className="text-body-sm text-muted-foreground mt-1">
                                      Taken on {exam.endDate ? formatDate(exam.endDate) : 'N/A'} &middot; Results pending
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                                    Pending
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.section>
              </>
            );
          }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
