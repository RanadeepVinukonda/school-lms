import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptionsSelect } from '@/components/ui/select';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { timetableService } from '@/services/timetableService';
import { getAllClasses, getAllSubjects, getAllTeachers, type ClassEntry } from '@/services/dataService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

export default function StudentTimetablePage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [selectedClassId, setSelectedClassId] = useState(user?.classId || '');

  const { data: classesData = [] } = useQuery({
    queryKey: ['student-classes'],
    queryFn: getAllClasses,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: getAllTeachers,
  });

  const teachers = useMemo(() => teachersData || [], [teachersData]);

  const { data: timetableRes, isLoading, error, refetch } = useQuery({
    queryKey: ['student-timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const timetableEntries = (timetableRes?.data ?? []) as any[];

  const classOptions = useMemo(
    () => classesData.map((c: ClassEntry) => {
      const capName = c.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const label = c.section ? `${capName}-Section ${c.section}` : capName;
      return { value: c.id, label };
    }),
    [classesData],
  );

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subjects) m.set(s.id, s.name);
    return m;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teachers) m.set(t.id, t.display_name || t.email);
    return m;
  }, [teachers]);

  const grid = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {};
    for (const day of DAYS) {
      map[day] = {};
    }
    for (const entry of timetableEntries) {
      const day = entry.day?.[0]?.toUpperCase() + entry.day?.slice(1)?.toLowerCase();
      if (map[day]) {
        const p = entry.period || 1;
        if (!map[day][p]) map[day][p] = [];
        map[day][p].push(entry);
      }
    }
    return map;
  }, [timetableEntries]);

  const periodNumbers = useMemo(() => {
    const nums = new Set<number>();
    for (const entry of timetableEntries) nums.add(entry.period || 1);
    return Array.from(nums).sort((a, b) => a - b);
  }, [timetableEntries]);

  return (
    <>
      <SEOHead title={_('Timetable')} description={_('View your class timetable by period and day')} />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Timetable')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('View class timetable by period, day, and subject')}</p>
        </motion.div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-title-sm">{_('Select Class')}</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionsSelect
              options={classOptions}
              placeholder={_('Choose a class...')}
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              className="w-full sm:w-64"
            />
          </CardContent>
        </Card>

        {!selectedClassId ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Icon name="calendar_month" size={64} className="text-muted-foreground/30 mb-3" />
            <p className="text-title-sm font-semibold">{_('Select a class to view timetable')}</p>
            <p className="text-body-sm text-muted-foreground mt-1">{_('Choose a class from the dropdown above')}</p>
          </div>
        ) : (
          <DataFetchWrapper
            data={timetableEntries}
            isLoading={isLoading}
            error={error ? new Error('Failed to load timetable') : null}
            onRetry={refetch}
            loadingType="table"
            emptyMessage={_('No timetable entries for this class')}
          >
            {() => (
              <div className="border border-border/60 rounded-xl bg-surface overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3.5 text-center w-20">Period</th>
                        {DAYS.map((day) => (
                          <th key={day} className="px-4 py-3.5 text-center min-w-[140px]">{DAY_SHORT[day] || day.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {periodNumbers.map((period) => (
                        <tr key={period} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-4 text-center font-bold text-muted-foreground text-label-sm align-middle">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-foreground font-semibold">
                              {period}
                            </span>
                          </td>
                          {DAYS.map((day) => {
                            const entries = grid[day]?.[period] ?? [];
                            return (
                              <td key={`${day}-${period}`} className="px-3 py-4 align-top">
                                {entries.length === 0 ? (
                                  <div className="min-h-[72px] flex items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/5">
                                    <span className="text-muted-foreground/20">&mdash;</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {entries.map((entry: any) => (
                                      <div
                                        key={entry.id}
                                        className="p-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent/5 hover:border-primary/20 transition-all shadow-sm flex flex-col gap-1"
                                      >
                                        <p className="text-label-sm font-bold text-primary leading-tight truncate">
                                          {subjectMap.get(entry.subject_id || entry.subjectId || '') || entry.subject_id || entry.subjectId || 'Subject'}
                                        </p>
                                        {(entry.teacher_id || entry.teacherId) && (
                                          <p className="text-[10px] text-muted-foreground leading-none flex items-center gap-1.5 truncate">
                                            <Icon name="person" size={10} className="text-muted-foreground/60 shrink-0" />
                                            <span className="truncate">{teacherMap.get(entry.teacher_id || entry.teacherId || '') || entry.teacher_id || entry.teacherId}</span>
                                          </p>
                                        )}
                                        {entry.room && (
                                          <p className="text-[10px] text-muted-foreground leading-none flex items-center gap-1.5 truncate">
                                            <Icon name="meeting_room" size={10} className="text-muted-foreground/60 shrink-0" />
                                            <span className="truncate">{entry.room}</span>
                                          </p>
                                        )}
                                        {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                          <p className="text-[9px] text-muted-foreground/60 font-mono leading-none flex items-center gap-1.5 mt-0.5 border-t border-border/20 pt-1.5">
                                            <Icon name="schedule" size={10} className="text-muted-foreground/40 shrink-0" />
                                            <span>{(entry.start_time || entry.startTime || '—').slice(0, 5)} &ndash; {(entry.end_time || entry.endTime || '—').slice(0, 5)}</span>
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DataFetchWrapper>
        )}
      </div>
    </>
  );
}