import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getTimetableByClass, getAllSubjects, getAllUsers, getAllClasses } from '@/services/dataService';
import type { TimetableEntry, Subject, UserDoc, ClassEntry } from '@/services/dataService';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

const dayLabels: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

export default function AdminTimetablePage() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: classList = [] } = useQuery({
    queryKey: ['admin-timetable-classes'],
    queryFn: getAllClasses,
  });

  const { data: timetableSlots = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-timetable', classId],
    queryFn: () => getTimetableByClass(classId!),
    enabled: !!classId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['admin-timetable-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-timetable-users'],
    queryFn: getAllUsers,
  });

  const classData = useMemo(
    () => classList.find((c: ClassEntry) => c.id === classId) ?? null,
    [classList, classId]
  );

  const timetableMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const slot of timetableSlots) {
      if (slot.day && slot.period != null) {
        map.set(`${slot.day}-${slot.period}`, slot);
      }
    }
    return map;
  }, [timetableSlots]);

  const pageTitle = classData ? `${classData.name} Timetable` : 'Timetable';

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={`Weekly timetable for ${classData?.name || 'class'}`}
      />
      <DataFetchWrapper
        data={(!isLoading && !isError) ? {} : undefined}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load timetable') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => {
            if (!classData) {
              return (
                <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="error" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">Class not found</p>
                      <p className="text-sm text-on-surface-variant">The class you are looking for does not exist.</p>
                      <Button variant="outline" onClick={() => navigate('/admin/classes')}>
                        <Icon name="arrow_back" size={16} className="mr-2" />
                        Back to Classes
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }

          const hasSlots = timetableSlots.length > 0;

          return (
            <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={listItem} className="flex items-center gap-3 flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/classes')}>
                  <Icon name="arrow_back" size={18} className="mr-1" />
                  Back
                </Button>
                <div>
                  <h1 className="text-headline-sm">{classData.name} Timetable</h1>
                  <p className="text-sm text-on-surface-variant">
                    Code: {classData.code} &middot; Grade {classData.grade || '\u2014'} &middot;{' '}
                    {hasSlots ? `${timetableSlots.length} scheduled slots` : 'No schedule yet'}
                  </p>
                </div>
              </motion.div>

              {!hasSlots ? (
                <motion.div variants={listItem}>
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="calendar_month" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No timetable set for this class</p>
                      <p className="text-sm text-on-surface-variant">
                        Add schedule entries using the Edit Schedule button.
                      </p>
                      <Button onClick={() => toast.success('Edit Schedule \u2014 ready for scheduling')}>
                        <Icon name="edit" size={16} className="mr-2" />
                        Edit Schedule
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div variants={listItem} className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-px bg-outline-variant rounded-lg overflow-hidden">
                      <div className="bg-surface-variant/50 p-2 flex items-center justify-center">
                        <Icon name="schedule" size={16} className="text-on-surface-variant" />
                      </div>
                      {days.map((day) => (
                        <div
                          key={day}
                          className="bg-surface-variant/50 p-2 text-center text-label-sm font-semibold text-on-surface-variant uppercase"
                        >
                          {dayLabels[day]}
                        </div>
                      ))}
                      {periods.map((period) => (
                        <>
                          <div
                            key={`label-${period}`}
                            className="bg-surface-variant/30 p-2 flex items-center justify-center text-label-sm font-medium text-on-surface-variant"
                          >
                            P{period}
                          </div>
                          {days.map((day) => {
                            const slot = timetableMap.get(`${day}-${period}`);
                            const subject = slot
                              ? subjects.find((s: Subject) => s.id === slot.subjectId)
                              : undefined;
                            const teacher = slot
                              ? users.find((u: UserDoc) => u.id === slot.teacherId)
                              : undefined;
                            return (
                              <div
                                key={`${day}-${period}`}
                                className={
                                  'min-h-[72px] p-2 bg-surface' +
                                  (slot ? ' hover:bg-surface-variant/30 transition-colors cursor-pointer' : '')
                                }
                                onClick={() => {
                                  if (slot) {
                                    toast.success(
                                      `${subject?.name || 'Subject'} \u2014 ${teacher?.displayName || 'Teacher'} \u2014 Room ${slot.room}`
                                    );
                                  }
                                }}
                              >
                                {slot ? (
                                  <div className="h-full flex flex-col justify-center gap-0.5">
                                    <span className="text-label-sm font-medium leading-tight">
                                      {subject?.name || '\u2014'}
                                    </span>
                                    <span className="text-[10px] text-on-surface-variant leading-tight">
                                      {teacher?.displayName || '\u2014'}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 w-fit mt-0.5">
                                      Room {slot.room}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-on-surface-variant/40 flex items-center justify-center h-full">
                                    \u2014
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
                    <Button onClick={() => toast.success('Edit Schedule \u2014 ready for scheduling')}>
                      <Icon name="edit" size={16} className="mr-2" />
                      Edit Schedule
                    </Button>
                  </div>
                </motion.div>
              )}
              </motion.div>
            </motion.div>
          );
        }}
      </DataFetchWrapper>
    </>
  );
}
