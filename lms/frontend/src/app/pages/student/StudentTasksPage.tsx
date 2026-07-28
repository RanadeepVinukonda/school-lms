import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import api from '@/services/api';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { getAllSubjects, getClass } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import type { AssignmentItem, ExamItem, QuizItem } from '@/services/dataService';
import type { Subject } from '@/types';
import {
  buildTasks,
  FilterBar,
  TaskSection,
  EmptyFilterState,
  urgencyOrder,
  type FilterTab,
} from '@/app/pages/student/StudentTaskComponents';
import { useTranslation } from '@/hooks/useTranslation';

export default function StudentTasksPage() {
  const { _ } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const studentId = useAuthStore((s) => s.user?.id);
  const classId = useAuthStore((s) => s.user?.classId);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-tasks', studentId, classId],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!studentId) return [];
      const [allSubjects, classDoc] = await Promise.all([
        getAllSubjects(),
        classId ? getClass(classId) : Promise.resolve(null),
      ]);
      const classSubjects = allSubjects.filter((sub) => classDoc?.subjectIds?.includes(sub.id));

      // Fetch assignments for the student's class using the newer assignment-v2 API (class-scoped)
      const assignmentsResponse = classId
        ? await api.get(`/assignments-v2/class/${classId}`).then((r) => r.data.data?.items ?? r.data.data ?? [])
        : [];
      const allAssignments = assignmentsResponse
        .filter((a: any) => !!a.releasedAt)
        .map((a: any) => ({ id: a.id, ...a })) as AssignmentItem[];

      // Fetch quizzes for the student's class using the newer quiz-v2 API (class-scoped)
      const quizzesResponse = classId
        ? await api.get(`/quizzes-v2/class/${classId}`).then((r) => r.data.data ?? [])
        : [];
      const allQuizzes = quizzesResponse
        .filter((q: any) => !!q.releasedAt)
        .map((q: any) => ({ id: q.id, ...q })) as QuizItem[];

      // Fetch student's quiz attempts to determine completion status and count
      const completedQuizIds = new Set<string>();
      const quizAttemptCount = new Map<string, number>();
      try {
        const attemptsRes = await api.get(`/quizzes-v2/attempts/my`).then((r) => r.data.data ?? []);
        for (const att of attemptsRes) {
          if (att.status === 'completed') completedQuizIds.add(att.quizId);
          quizAttemptCount.set(att.quizId, (quizAttemptCount.get(att.quizId) ?? 0) + 1);
        }
      } catch { /* ignore */ }

      for (const q of allQuizzes) {
        if (completedQuizIds.has(q.id)) (q as any).status = 'completed';
        (q as any).attemptsUsed = quizAttemptCount.get(q.id) ?? 0;
      }

      // Fetch exams for the student's class using the newer exam-v2 API (class-scoped)
      const examsResponse = classId
        ? await api.get(`/exams-v2/class/${classId}`).then((r) => r.data.data ?? [])
        : [];
      const allExams = examsResponse
        .filter((e: any) => !!e.releasedAt)
        .map((e: any) => ({ id: e.id, ...e })) as ExamItem[];

      return buildTasks(allAssignments, allQuizzes, allExams, classSubjects as Subject[]);
    },
    enabled: !!studentId,
  });

  useRealtimeInvalidation([{ table: 'assignments', queryKey: ['student-tasks', studentId ?? '', classId ?? ''] }]);

  const { data: subjectsData } = useQuery({
    queryKey: ['student-subjects', studentId, classId],
    queryFn: async () => {
      if (!classId) return [];
      const [allSubjects, classDoc] = await Promise.all([
        getAllSubjects(),
        getClass(classId),
      ]);
      if (!classDoc || !classDoc.subjectIds) return [];
      return allSubjects.filter((sub) => classDoc.subjectIds?.includes(sub.id));
    },
    enabled: !!studentId,
  });

  const overdueCount = useMemo(
    () => {
      if (!data) return 0;
      return data.filter((t) => {
        if (selectedSubjectId && t.subjectId !== selectedSubjectId) return false;
        return t.urgency === 'overdue';
      }).length;
    },
    [data, selectedSubjectId],
  );

  const filteredAndGrouped = useMemo(() => {
    if (!data) return null;

    const filtered = data.filter((item) => {
      if (selectedSubjectId && item.subjectId !== selectedSubjectId) {
        return false;
      }
      switch (activeFilter) {
        case 'overdue':
          return item.urgency === 'overdue';
        case 'assignments':
          return item.type === 'assignment';
        case 'quizzes':
          return item.type === 'quiz';
        case 'exams':
          return item.type === 'exam';
        default:
          return true;
      }
    });

    const sections = urgencyOrder
      .map((level) => ({ level, tasks: filtered.filter((t) => t.urgency === level) }))
      .filter((s) => s.tasks.length > 0);

    return { all: filtered, sections };
  }, [data, activeFilter, selectedSubjectId]);

  return (
    <>
      <SEOHead
        title={overdueCount > 0 ? `${_('Tasks')} (${overdueCount} ${_('overdue')})` : _('Tasks')}
        description={_('View all upcoming tasks sorted by urgency')}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8 sm:space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h1 className="text-headline-sm font-bold flex items-center gap-3">
                {_('Tasks')}
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueCount} {_('overdue')}
                  </Badge>
                )}
              </h1>
              <p className="text-body-md text-muted-foreground">{_('Stay on top of your upcoming work')}</p>
            </div>
            {subjectsData && subjectsData.length > 0 && (
              <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none">
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
                {subjectsData.map((sub: any) => {
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
                      style={isSelected ? { backgroundColor: sub.color || 'hsl(var(--accent-default))', borderColor: sub.color || 'hsl(var(--accent-default))' } : {}}
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
          error={isError ? error ?? new Error(_('Failed to load tasks')) : null}
          loadingType="list"
          onRetry={() => refetch()}
          errorTitle={_('Failed to load tasks')}
          emptyMessage={_('No tasks available right now')}
          emptyIcon={<Icon name="task_alt" size={40} />}
        >
          {() => (
            <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
              <FilterBar active={activeFilter} onChange={setActiveFilter} overdueCount={overdueCount} />

              {filteredAndGrouped && filteredAndGrouped.all.length === 0 ? (
                <EmptyFilterState filter={activeFilter} />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="space-y-6"
                >
                  {filteredAndGrouped?.sections.map((section) => (
                    <TaskSection key={section.level} level={section.level} tasks={section.tasks} />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
