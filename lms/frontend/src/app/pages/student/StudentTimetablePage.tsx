import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { pageTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { getTimetableByClass, getSubject, getUser } from '@/services/dataService';
import type { Subject as DataServiceSubject, UserDoc, TimetableEntry } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';

interface TimetableSlot extends TimetableEntry {
  subject: DataServiceSubject | null;
  teacher: UserDoc | null;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

const DAY_FULL: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StudentTimetablePage() {
  const student = useAuthStore((s) => s.user);
  const classId = (student as { classId?: string } | null)?.classId;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-timetable', classId],
    queryFn: async () => {
      if (!classId) return null;

      const slots = await getTimetableByClass(classId);
      if (slots.length === 0) return null;

      const subjectIds = [...new Set(slots.map((s) => s.subjectId).filter(Boolean))] as string[];
      const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter(Boolean))] as string[];

      const [subjects, teachers] = await Promise.all([
        Promise.all(subjectIds.map((sid) => getSubject(sid))),
        Promise.all(teacherIds.map((tid) => getUser(tid))),
      ]);

      const subjectMap = new Map(subjects.filter(Boolean).map((s) => [s!.id, s!]));
      const teacherMap = new Map(teachers.filter(Boolean).map((t) => [t!.id, t!]));

      return slots.map((slot) => ({
        ...slot,
        subject: slot.subjectId ? (subjectMap.get(slot.subjectId) ?? null) : null,
        teacher: slot.teacherId ? (teacherMap.get(slot.teacherId) ?? null) : null,
      }));
    },
    enabled: !!classId,
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayKey = days.find((d) => d === today) ?? null;

  return (
    <>
      <SEOHead title="Timetable" description="Your class schedule" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-6xl mx-auto pb-20"
      >
        <div className="mb-4">
          <h1 className="text-headline-sm font-bold">Timetable</h1>
          <p className="text-body-md text-muted-foreground">Weekly class schedule</p>
        </div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load timetable') : null}
          loadingType="table"
          emptyMessage="Your class timetable has not been set up yet. Check back later or contact your homeroom teacher."
          emptyIcon={<Icon name="calendar_month" size={32} />}
          onRetry={() => refetch()}
          errorTitle="Failed to load timetable"
        >
          {(slots: TimetableSlot[]) => (
            <div className="overflow-x-auto -mx-4 px-4 pb-4">
              <div className="grid grid-cols-6 gap-2 min-w-[640px]">
                <div className="sticky left-0 bg-background z-10">
                  <Card variant="elevated" className="h-10 flex items-center justify-center rounded-lg">
                    <span className="text-label-sm font-semibold text-muted-foreground">Period</span>
                  </Card>
                </div>
                {days.map((day) => (
                  <div key={day} className="text-center">
                    <Card
                      variant="elevated"
                      className={cn(
                        'h-10 flex items-center justify-center rounded-lg font-semibold text-title-sm',
                        day === todayKey
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-variant text-muted-foreground',
                      )}
                    >
                      <span className="hidden sm:inline">{DAY_FULL[day]}</span>
                      <span className="sm:hidden">{DAY_LABELS[day]}</span>
                    </Card>
                  </div>
                ))}

                {periods.map((period) => (
                  <div key={period} className="contents">
                    <div className="sticky left-0 bg-background z-10">
                      <div className="h-20 flex items-center justify-center rounded-lg bg-surface-variant/50">
                        <span className="text-label-sm font-medium text-muted-foreground">
                          {period}
                        </span>
                      </div>
                    </div>

                    {days.map((day) => {
                      const slot = slots.find((s) => s.day === day && s.period === period);
                      const isToday = day === todayKey;

                      if (!slot) {
                        return (
                          <div
                            key={`${day}-${period}`}
                            className={cn(
                              'h-20 rounded-lg border border-dashed',
                              isToday ? 'border-primary/20 bg-primary-container/30' : 'border-outline-variant/50',
                            )}
                          />
                        );
                      }

                      return (
                        <motion.div
                          key={slot.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (period - 1) * 0.03 }}
                          className={cn(
                            'h-20 rounded-lg p-2 flex flex-col justify-between cursor-default group relative overflow-hidden',
                            isToday
                              ? 'ring-2 ring-primary/30'
                              : '',
                          )}
                          style={{
                            backgroundColor: slot.subject
                              ? `${slot.subject.color || '#6366f1'}15`
                              : 'hsl(var(--surface-variant))',
                          }}
                        >
                          {slot.subject && (
                            <div
                              className="absolute top-0 left-0 w-1 h-full rounded-l"
                              style={{ backgroundColor: slot.subject.color || '#6366f1' }}
                            />
                          )}
                          <div className="pl-2 min-w-0">
                            <p
                              className="text-label-sm font-semibold truncate leading-tight"
                              style={{ color: slot.subject?.color }}
                            >
                              {slot.subject?.name ?? 'Unknown'}
                            </p>
                            <p className="text-body-sm text-muted-foreground truncate leading-tight mt-0.5">
                              {slot.teacher?.displayName ?? 'Unknown'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 pl-2">
                            <Icon
                              name="meeting_room"
                              size={10}
                              className="text-muted-foreground flex-shrink-0"
                            />
                            <span className="text-body-sm text-muted-foreground truncate">
                              Room {slot.room}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
