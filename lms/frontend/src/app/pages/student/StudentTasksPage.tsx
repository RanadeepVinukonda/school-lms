import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
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
  const studentId = useAuthStore((s) => s.user?.id);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-tasks', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const allSubjects = await getAllSubjects();
      const enrollments = await getEnrollmentsByStudent(studentId);
      const enrolledSubjectIds = new Set(enrollments.map((e) => e.courseId));

      // Fetch assignments for enrolled subjects only
      const assignmentPromises = [...enrolledSubjectIds].map((sid) =>
        getAssignmentsBySubject(sid).catch(() => [] as AssignmentItem[]),
      );
      const assignmentResults = await Promise.all(assignmentPromises);
      const allAssignments = assignmentResults.flat();

      // Fetch quizzes — filter by subjectId field
      const quizzesSnap = await getDocs(collection(db, 'quizzes'));
      const allQuizzes = quizzesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as QuizItem)
        .filter((q) => enrolledSubjectIds.has((q as any).subjectId));

      // Fetch exams for enrolled subjects only
      const examPromises = [...enrolledSubjectIds].map((sid) => getExamsBySubject(sid));
      const examResults = await Promise.all(examPromises);
      const allExams = examResults.flat();

      return buildTasks(allAssignments, allQuizzes, allExams, allSubjects as Subject[]);
    },
    enabled: !!studentId,
  });

  const overdueCount = useMemo(
    () => data?.filter((t) => t.urgency === 'overdue').length ?? 0,
    [data],
  );

  const filteredAndGrouped = useMemo(() => {
    if (!data) return null;

    const filtered = data.filter((item) => {
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
  }, [data, activeFilter]);

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
        <div className="flex items-center justify-between">
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
