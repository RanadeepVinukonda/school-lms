import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { pageTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockTimetable, mockSubjects, mockUsers, days, periods } from '@/lib/mockData';

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

function TimetableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <div key={day} className="flex-1 min-w-[120px] space-y-2">
            <Skeleton className="h-8 rounded-lg" />
            {periods.slice(0, 5).map((p) => (
              <Skeleton key={p} className="h-16 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={32} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load timetable</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDisplay() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Icon name="calendar_month" size={32} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold">No timetable available</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Your class timetable has not been set up yet. Check back later or contact your homeroom teacher.
        </p>
      </CardContent>
    </Card>
  );
}

export default function StudentTimetablePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-timetable'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      const student = mockUsers.student1;
      const classId = student.classId;
      if (!classId) return null;

      const slots = mockTimetable.filter((tt) => tt.classId === classId);
      if (slots.length === 0) return null;

      return slots.map((slot) => {
        const subject = mockSubjects.find((s) => s.id === slot.subjectId);
        const teacher = Object.values(mockUsers).find((u) => u.id === slot.teacherId);
        return {
          ...slot,
          subject: subject ?? null,
          teacher: teacher ?? null,
        };
      });
    },
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
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-sm text-muted-foreground">Weekly class schedule</p>
        </div>

        {isLoading ? (
          <TimetableSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyDisplay />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 pb-4">
            <div className="grid grid-cols-6 gap-2 min-w-[640px]">
              {/* Header Row */}
              <div className="sticky left-0 bg-background z-10">
                <div className="h-10 flex items-center justify-center rounded-lg bg-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground">Period</span>
                </div>
              </div>
              {days.map((day) => (
                <div key={day} className="text-center">
                  <div
                    className={cn(
                      'h-10 flex items-center justify-center rounded-lg font-semibold text-sm',
                      day === todayKey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    <span className="hidden sm:inline">{DAY_FULL[day]}</span>
                    <span className="sm:hidden">{DAY_LABELS[day]}</span>
                  </div>
                </div>
              ))}

              {/* Period Rows */}
              {periods.map((period) => (
                <div key={period} className="contents">
                  {/* Period Number */}
                  <div className="sticky left-0 bg-background z-10">
                    <div className="h-20 flex items-center justify-center rounded-lg bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">
                        {period}
                      </span>
                    </div>
                  </div>

                  {/* Day Cells */}
                  {days.map((day) => {
                    const slot = data.find((s) => s.day === day && s.period === period);
                    const isToday = day === todayKey;

                    if (!slot) {
                      return (
                        <div
                          key={`${day}-${period}`}
                          className={cn(
                            'h-20 rounded-lg border border-dashed',
                            isToday ? 'border-primary/20 bg-primary/5' : 'border-muted/30',
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
                            ? `${slot.subject.color}15`
                            : 'hsl(var(--muted))',
                        }}
                      >
                        {slot.subject && (
                          <div
                            className="absolute top-0 left-0 w-1 h-full rounded-l"
                            style={{ backgroundColor: slot.subject.color }}
                          />
                        )}
                        <div className="pl-2 min-w-0">
                          <p
                            className="text-xs font-semibold truncate leading-tight"
                            style={{ color: slot.subject?.color }}
                          >
                            {slot.subject?.name ?? 'Unknown'}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                            {slot.teacher?.displayName ?? 'Unknown'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 pl-2">
                          <Icon
                            name="meeting_room"
                            size={10}
                            className="text-muted-foreground flex-shrink-0"
                          />
                          <span className="text-[10px] text-muted-foreground truncate">
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
      </motion.div>
    </>
  );
}
