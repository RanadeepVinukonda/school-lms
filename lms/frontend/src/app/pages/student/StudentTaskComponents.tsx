import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { formatDate, cn } from '@/lib/utils';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { formatTime } from '@/lib/format';
import type { AssignmentItem, ExamItem, QuizItem } from '@/services/dataService';
import type { Subject } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

export type TaskType = 'assignment' | 'quiz' | 'exam';
export type UrgencyLevel = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';
export type FilterTab = 'all' | 'overdue' | 'assignments' | 'quizzes' | 'exams';

export interface TaskItem {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  subjectName: string;
  subjectId?: string;
  date: Date | null;
  urgency: UrgencyLevel;
  linkTo: string;
  points?: number;
  status?: string;
  timeLimit?: number;
  questionCount?: number;
  duration?: number;
  maxAttempts?: number;
  attemptsUsed?: number;
}

export const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'select_all' },
  { key: 'overdue', label: 'Overdue', icon: 'error_outline' },
  { key: 'assignments', label: 'Assignments', icon: 'assignment' },
  { key: 'quizzes', label: 'Quizzes', icon: 'quiz' },
  { key: 'exams', label: 'Exams', icon: 'fact_check' },
];

export const urgencyOrder: UrgencyLevel[] = ['overdue', 'today', 'tomorrow', 'thisWeek', 'later'];

export const urgencyStyles: Record<
  UrgencyLevel,
  { containerClass: string; badgeVariant: 'destructive' | 'warning' | 'info' | 'outline'; label: string }
> = {
  overdue: {
    containerClass: 'bg-error-container/50 border-l-4 border-l-error',
    badgeVariant: 'destructive',
    label: 'Overdue',
  },
  today: {
    containerClass: 'bg-warning-container/50 border-l-4 border-l-warning',
    badgeVariant: 'warning',
    label: 'Due Today',
  },
  tomorrow: {
    containerClass: 'bg-warning-container/50 border-l-4 border-l-warning',
    badgeVariant: 'warning',
    label: 'Due Tomorrow',
  },
  thisWeek: {
    containerClass: 'bg-primary-container/30 border-l-4 border-l-primary',
    badgeVariant: 'info',
    label: 'This Week',
  },
  later: {
    containerClass: '',
    badgeVariant: 'outline',
    label: 'Upcoming',
  },
};

export const urgencySectionLabels: Record<UrgencyLevel, { title: string; icon: string }> = {
  overdue: { title: 'Overdue', icon: 'error_outline' },
  today: { title: 'Due Today', icon: 'today' },
  tomorrow: { title: 'Due Tomorrow', icon: 'next_week' },
  thisWeek: { title: 'This Week', icon: 'date_range' },
  later: { title: 'Upcoming', icon: 'calendar_month' },
};

const iconMap: Record<TaskType, { name: string; bg: string; color: string }> = {
  assignment: { name: 'assignment', bg: 'bg-primary-container', color: 'text-primary' },
  quiz: { name: 'quiz', bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
  exam: { name: 'fact_check', bg: 'bg-error-container', color: 'text-error' },
};

export function getUrgencyLevel(date: Date | null): UrgencyLevel {
  if (!date) return 'later';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return 'thisWeek';
  return 'later';
}

function findSubjectName(
  subjects: Subject[],
  subjectId?: string,
  fallback?: string,
): string {
  if (subjectId) {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) return subject.name;
  }
  return fallback || 'Unknown Subject';
}

export function buildTasks(
  assignments: AssignmentItem[],
  quizzes: QuizItem[],
  exams: ExamItem[],
  subjects: Subject[],
): TaskItem[] {
  const tasks: TaskItem[] = [];

  for (const a of assignments) {
    const dueDate = a.dueDate ? new Date(a.dueDate) : null;
    tasks.push({
      id: a.id,
      type: 'assignment',
      title: a.title,
      description: a.description ?? '',
      subjectName: findSubjectName(subjects, a.subjectId, a.subjectName),
      subjectId: a.subjectId,
      date: dueDate,
      urgency: getUrgencyLevel(dueDate),
      linkTo: `/assignments/${a.id}`,
      points: a.points,
      status: a.status,
    });
  }

  for (const q of quizzes) {
    tasks.push({
      id: q.id,
      type: 'quiz',
      title: q.title,
      description: q.description ?? '',
      subjectName: findSubjectName(subjects, q.subjectId, q.subjectName),
      subjectId: q.subjectId,
      date: null,
      urgency: 'later',
      linkTo: `/student/assessments/${q.id}/take`,
      timeLimit: q.timeLimit,
      questionCount: q.questionCount ?? (Array.isArray(q.questions) ? q.questions.length : 0),
      status: q.status,
      maxAttempts: (q as any).maxAttempts,
      attemptsUsed: (q as any).attemptsUsed,
    });
  }

  for (const e of exams) {
    const startDate = e.startDate ? new Date(e.startDate) : null;
    tasks.push({
      id: e.id,
      type: 'exam',
      title: e.title,
      description: e.description ?? '',
      subjectName: findSubjectName(subjects, e.subjectId, e.subjectName),
      subjectId: e.subjectId,
      date: startDate,
      urgency: getUrgencyLevel(startDate),
      linkTo: `/student/assessments/${e.id}/take?type=exam`,
      duration: e.duration,
      questionCount: Array.isArray(e.questions) ? e.questions.length : 0,
    });
  }

  return tasks;
}

function UrgencyBadge({ urgency, date }: { urgency: UrgencyLevel; date: Date | null }) {
  const { _ } = useTranslation();
  const style = urgencyStyles[urgency];
  return (
    <Badge variant={style.badgeVariant} className="text-[10px] flex-shrink-0">
      {urgency === 'later' && date ? formatDate(date) : _(style.label)}
    </Badge>
  );
}

export function FilterBar({
  active,
  onChange,
  overdueCount,
}: {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
  overdueCount: number;
}) {
  const { _ } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
      {FILTER_TABS.map((tab) => (
        <Button
          key={tab.key}
          variant={active === tab.key ? 'default' : 'secondary'}
          size="sm"
          className={cn(
            'gap-1 sm:gap-1.5 whitespace-nowrap transition-all px-2 sm:px-3 text-[11px] sm:text-xs',
            tab.key === 'overdue' && overdueCount > 0 && active !== 'overdue' && 'ring-1 ring-error/30',
          )}
          onClick={() => onChange(tab.key)}
        >
          <Icon name={tab.icon} size={14} />
          {_(tab.label)}
          {tab.key === 'overdue' && overdueCount > 0 && (
            <span className="ml-0.5 tabular-nums">({overdueCount})</span>
          )}
        </Button>
      ))}
    </div>
  );
}

function TaskCard({ item }: { item: TaskItem }) {
  const { _ } = useTranslation();
  const style = urgencyStyles[item.urgency];
  const iconStyle = iconMap[item.type];
  const isUrgent = item.urgency !== 'later';

  return (
    <Link to={item.linkTo}>
      <Card
        className={cn('border-border/60 transition-all duration-300 group', isUrgent && style.containerClass)}
      >
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center sm:items-start gap-3 sm:gap-4">
            <div className={cn('h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0', iconStyle.bg)}>
              <Icon name={iconStyle.name} size={20} className={iconStyle.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <p className="font-semibold text-title-sm line-clamp-2 sm:truncate">{item.title}</p>
                {item.status === 'completed' ? (
                  <Badge variant="success" className="text-[10px] shrink-0">{_('Completed')}</Badge>
                ) : item.type === 'quiz' ? (
                  <Badge variant="info" className="text-[10px] shrink-0">{_('Open')}</Badge>
                ) : (
                  <span className="shrink-0"><UrgencyBadge urgency={item.urgency} date={item.date} /></span>
                )}
              </div>
              <p className="text-body-md text-muted-foreground mt-0.5">{item.subjectName}</p>
              <p className="text-body-md text-muted-foreground mt-1 line-clamp-1 hidden sm:block">{item.description}</p>
              <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-body-sm sm:text-body-md text-muted-foreground flex-wrap">
                {item.type === 'assignment' && (
                  <>
                    {item.points !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="star" size={12} />
                        <span className="text-[11px] sm:text-body-md">{item.points} {_('pts')}</span>
                      </span>
                    )}
                    {item.status && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px]">{item.status}</Badge>
                    )}
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <Icon name="calendar_today" size={12} />
                        <span className="text-[11px] sm:text-body-md">{formatDate(item.date)}</span>
                      </span>
                    )}
                  </>
                )}
                {item.type === 'quiz' && (
                  <>
                    {item.timeLimit !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={12} />
                        <span className="text-[11px] sm:text-body-md">{formatTime(item.timeLimit)}</span>
                      </span>
                    )}
                    {item.questionCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="quiz" size={12} />
                        <span className="text-[11px] sm:text-body-md">{item.questionCount} {_('questions')}</span>
                      </span>
                    )}
                    {item.maxAttempts !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="replay" size={12} />
                        <span className="text-[11px] sm:text-body-md">{Math.max(0, item.maxAttempts - (item.attemptsUsed ?? 0))} {_('attempts left')}</span>
                      </span>
                    )}
                  </>
                )}
                {item.type === 'exam' && (
                  <>
                    {item.duration !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={12} />
                        <span className="text-[11px] sm:text-body-md">{formatTime(item.duration)}</span>
                      </span>
                    )}
                    {item.questionCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Icon name="quiz" size={12} />
                        <span className="text-[11px] sm:text-body-md">{item.questionCount} {_('questions')}</span>
                      </span>
                    )}
                    {item.date && (
                      <span className="flex items-center gap-1">
                        <Icon name="calendar_today" size={12} />
                        <span className="text-[11px] sm:text-body-md">{formatDate(item.date)}</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <Icon
              name="chevron_right"
              size={20}
              className="text-muted-foreground flex-shrink-0 self-center sm:self-start sm:mt-2 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TaskSection({ level, tasks }: { level: UrgencyLevel; tasks: TaskItem[] }) {
  const { _ } = useTranslation();
  if (tasks.length === 0) return null;

  const section = urgencySectionLabels[level];
  const isNonUrgent = level === 'later';

  return (
    <motion.div variants={cardStackReveal} custom={0}>
      <section>
        <h2 className={cn('text-title-sm font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2', isNonUrgent && 'text-muted-foreground')}>
          <Icon name={section.icon} size={18} className={isNonUrgent ? 'text-muted-foreground' : 'text-primary'} />
          {_(section.title)}
          <span className="text-body-md text-muted-foreground font-normal ml-1">({tasks.length})</span>
        </h2>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {tasks.map((item) => (
            <motion.div key={`${item.type}-${item.id}`} variants={scrollReveal}>
              <TaskCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </motion.div>
  );
}

export function EmptyFilterState({ filter }: { filter: FilterTab }) {
  const { _ } = useTranslation();
  const messages: Record<FilterTab, { icon: string; message: string }> = {
    all: { icon: 'task_alt', message: 'No tasks available right now' },
    overdue: { icon: 'check_circle', message: "No overdue tasks — you're all caught up!" },
    assignments: { icon: 'assignment', message: 'No assignments found' },
    quizzes: { icon: 'quiz', message: 'No quizzes available' },
    exams: { icon: 'fact_check', message: 'No exams scheduled' },
  };

  const m = messages[filter];

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col items-center gap-3 py-8 sm:py-10">
        <Icon name={m.icon} size={40} className="text-muted-foreground/50" />
        <p className="text-body-md text-muted-foreground">{_(m.message)}</p>
      </CardContent>
    </Card>
  );
}
