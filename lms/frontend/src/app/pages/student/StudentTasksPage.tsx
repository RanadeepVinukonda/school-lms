import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import api from '@/services/api';
import { pageTransition, listContainer } from '@/lib/motion';
import { getAllSubjects, getExamsBySubject, getEnrollmentsByStudent, getAssignmentsBySubject } from '@/services/dataService';
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

export default function StudentTasksPage() {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const studentId = useAuthStore((s) => s.user?.id);
  const classId = useAuthStore((s) => s.user?.classId);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-tasks', studentId, classId],
    queryFn: async () => {
      if (!studentId) return [];
      const allSubjects = await getAllSubjects();
      const enrollments = await getEnrollmentsByStudent(studentId);
      const enrolledSubjectIds = new Set(enrollments.map((e) => e.courseId));

      // Fetch assignments for the student's class using the newer assignment-v2 API (class-scoped)
      const assignmentsResponse = classId
        ? await api.get(`/assignments-v2/class/${classId}`).then((r) => r.data.data?.items ?? r.data.data ?? [])
        : [];
      const allAssignments = assignmentsResponse
        .filter((a: any) => !!a.releasedAt)
        .map((a: any) => ({ id: a.id, ...a })) as AssignmentItem[];

      // Fetch quizzes for the student's class using the newer quiz‑v2 API (class‑scoped)
      const quizzesResponse = classId
        ? await api.get(`/quizzes-v2/class/${classId}`).then((r) => r.data.data ?? [])
        : [];
      const allQuizzes = quizzesResponse
        .filter((q: any) => !!q.releasedAt)
        .map((q: any) => ({ id: q.id, ...q })) as QuizItem[];

      // Fetch exams for the student's class using the newer exam‑v2 API (class‑scoped)
      const examsResponse = classId
        ? await api.get(`/exams-v2/class/${classId}`).then((r) => r.data.data ?? [])
        : [];
      const allExams = examsResponse
        .filter((e: any) => !!e.releasedAt)
        .map((e: any) => ({ id: e.id, ...e })) as ExamItem[];

      return buildTasks(allAssignments, allQuizzes, allExams, allSubjects as Subject[]);
    },
    enabled: !!studentId,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['student-subjects', studentId],
    queryFn: () => getAllSubjects(),
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
        title={overdueCount > 0 ? `Tasks (${overdueCount} overdue)` : 'Tasks'}
        description="View all upcoming tasks sorted by urgency"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-6 pb-20"
      >
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-headline-sm font-bold flex items-center gap-3">
              Tasks
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} overdue
                </Badge>
              )}
            </h1>
            <p className="text-body-md text-muted-foreground">Stay on top of your upcoming work</p>
          </div>
          {subjectsData && subjectsData.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                onClick={() => setSelectedSubjectId('')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedSubjectId === ''
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface text-on-surface hover:bg-surface-variant/40 border-outline-variant/60"
                }`}
              >
                <Icon name="select_all" size={14} />
                All Subjects
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
                        : "bg-surface text-on-surface hover:bg-surface-variant/40 border-outline-variant/60"
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

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load tasks') : null}
          loadingType="list"
          onRetry={() => refetch()}
          errorTitle="Failed to load tasks"
          emptyMessage="No tasks available right now"
          emptyIcon={<Icon name="task_alt" size={40} />}
        >
          {() => (
            <>
              <FilterBar active={activeFilter} onChange={setActiveFilter} overdueCount={overdueCount} />

              {filteredAndGrouped && filteredAndGrouped.all.length === 0 ? (
                <EmptyFilterState filter={activeFilter} />
              ) : (
                <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
                  {filteredAndGrouped?.sections.map((section) => (
                    <TaskSection key={section.level} level={section.level} tasks={section.tasks} />
                  ))}
                </motion.div>
              )}
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
