import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { listContainer, listItem } from '@/lib/motion';
import { mockTimetable, mockSubjects, mockUsers, mockClasses, days, periods } from '@/lib/mockData';

const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

function TimetableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function AdminTimetablePage() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-timetable', classId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const classData = useMemo(
    () => mockClasses.find((c) => c.id === classId),
    [classId]
  );

  const timetableMap = useMemo(() => {
    const map = new Map<string, typeof mockTimetable[number]>();
    const classSlots = mockTimetable.filter((tt) => tt.classId === classId);
    classSlots.forEach((slot) => {
      map.set(`${slot.day}-${slot.period}`, slot);
    });
    return map;
  }, [classId]);

  if (isLoading) return <TimetableSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead
          title={classData ? `${classData.name} Timetable` : 'Timetable'}
          description="Class timetable"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon name="error" size={32} className="text-destructive" />
            </div>
            <p className="font-medium">Failed to load timetable</p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={16} className="mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!classData) {
    return (
      <>
        <SEOHead title="Timetable" description="Class timetable" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Icon name="error" size={48} className="text-muted-foreground/50" />
            <p className="font-medium">Class not found</p>
            <p className="text-sm text-muted-foreground">The class you are looking for does not exist.</p>
            <Button variant="outline" onClick={() => navigate('/admin/classes')}>
              <Icon name="arrow_back" size={16} className="mr-2" />
              Back to Classes
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const hasSlots = Array.from(timetableMap.values()).length > 0;

  return (
    <>
      <SEOHead
        title={`${classData.name} Timetable`}
        description={`Weekly timetable for ${classData.name}`}
      />
      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={listItem} className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/classes')}>
            <Icon name="arrow_back" size={18} className="mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{classData.name} Timetable</h1>
            <p className="text-sm text-muted-foreground">
              Code: {classData.code} &middot; Grade {classData.grade} &middot;{' '}
              {hasSlots ? `${timetableMap.size} scheduled slots` : 'No schedule yet'}
            </p>
          </div>
        </motion.div>

        {!hasSlots ? (
          <motion.div variants={listItem}>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <Icon name="calendar_month" size={48} className="text-muted-foreground/50" />
                <p className="font-medium">No timetable set for this class</p>
                <p className="text-sm text-muted-foreground">
                  Add schedule entries using the Edit Schedule button.
                </p>
                <Button onClick={() => toast.success('Edit Schedule — ready for scheduling')}>
                  <Icon name="edit" size={16} className="mr-2" />
                  Edit Schedule
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={listItem} className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-px bg-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-2 flex items-center justify-center">
                  <Icon name="schedule" size={16} className="text-muted-foreground" />
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="bg-muted/50 p-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                  >
                    {dayLabels[day]}
                  </div>
                ))}
                {periods.map((period) => (
                  <>
                    <div
                      key={`label-${period}`}
                      className="bg-muted/30 p-2 flex items-center justify-center text-xs font-medium text-muted-foreground"
                    >
                      P{period}
                    </div>
                    {days.map((day) => {
                      const slot = timetableMap.get(`${day}-${period}`);
                      const subject = slot
                        ? mockSubjects.find((s) => s.id === slot.subjectId)
                        : undefined;
                      const teacher = slot
                        ? Object.values(mockUsers).find((u) => u.id === slot.teacherId)
                        : undefined;
                      return (
                        <div
                          key={`${day}-${period}`}
                          className={cn(
                            'min-h-[72px] p-2 bg-background',
                            slot ? 'hover:bg-muted/30 transition-colors cursor-pointer' : ''
                          )}
                          onClick={() => {
                            if (slot) {
                              toast.success(
                                `${subject?.name || 'Subject'} — ${teacher?.displayName || 'Teacher'} — Room ${slot.room}`
                              );
                            }
                          }}
                        >
                          {slot ? (
                            <div className="h-full flex flex-col justify-center gap-0.5">
                              <span className="text-xs font-medium leading-tight">
                                {subject?.name || '—'}
                              </span>
                              <span className="text-[10px] text-muted-foreground leading-tight">
                                {teacher?.displayName || '—'}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 w-fit mt-0.5">
                                Room {slot.room}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 flex items-center justify-center h-full">
                              —
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={() => toast.success('Edit Schedule — ready for scheduling')}>
                <Icon name="edit" size={16} className="mr-2" />
                Edit Schedule
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
