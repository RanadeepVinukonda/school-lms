import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { pageTransition, listContainer } from '@/lib/motion';
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-tasks'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return buildTasks();
    },
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
