import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptionsSelect } from '@/components/ui/select';
import { timetableService } from '@/services/timetableService';
import { getAllClasses, getAllSubjects, getAllTeachers } from '@/services/dataService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

export default function TeacherTimetablePage() {
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: classesData = [] } = useQuery({
    queryKey: ['teacher-classes'],
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
    queryKey: ['teacher-timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const timetableEntries = ((timetableRes as any)?.data || []) as any[];

  const classOptions = useMemo(
    () => classesData.map((c) => ({ value: c.id, label: c.name })),
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
      <SEOHead title="Timetable" description="View class timetable by period and day" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Class Timetable</h1>
          <p className="text-body-md text-muted-foreground mt-1">View timetable by class, period, and day</p>
        </motion.div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-title-sm">Select Class</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionsSelect
              options={classOptions}
              placeholder="Choose a class..."
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              className="w-full sm:w-64"
            />
          </CardContent>
        </Card>

        {!selectedClassId ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Icon name="calendar_month" size={64} className="text-muted-foreground/30 mb-3" />
            <p className="text-title-sm font-semibold">Select a class to view timetable</p>
            <p className="text-body-sm text-muted-foreground mt-1">Choose a class from the dropdown above</p>
          </div>
        ) : (
          <DataFetchWrapper
            data={timetableEntries}
            isLoading={isLoading}
            error={error ? new Error('Failed to load timetable') : null}
            onRetry={refetch}
            loadingType="table"
            emptyMessage="No timetable entries for this class"
          >
            {() => (
              <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                <table className="w-full text-left min-w-[750px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-3 text-center w-16">Period</th>
                      {DAYS.map((day) => (
                        <th key={day} className="px-3 py-3 text-center">{DAY_SHORT[day] || day.slice(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {periodNumbers.map((period) => (
                      <tr key={period} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-3 text-center font-bold text-muted-foreground text-label-sm align-top">
                          {period}
                        </td>
                        {DAYS.map((day) => {
                          const entries = grid[day]?.[period] ?? [];
                          return (
                            <td key={`${day}-${period}`} className="px-3 py-3 align-top min-w-[150px]">
                              {entries.length === 0 ? (
                                <div className="min-h-[72px] flex items-center justify-center">
                                  <span className="text-muted-foreground/20">&mdash;</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {entries.map((entry: any) => (
                                    <div key={entry.id}>
                                      <p className="text-body-sm font-semibold text-primary">
                                        {subjectMap.get(entry.subject_id || entry.subjectId || '') || entry.subject_id || entry.subjectId || 'Subject'}
                                      </p>
                                      {(entry.teacher_id || entry.teacherId) && (
                                        <p className="text-body-xs text-muted-foreground mt-0.5">
                                          {teacherMap.get(entry.teacher_id || entry.teacherId || '') || entry.teacher_id || entry.teacherId}
                                        </p>
                                      )}
                                      {entry.room && (
                                        <p className="text-body-xs text-muted-foreground mt-0.5">
                                          Room {entry.room}
                                        </p>
                                      )}
                                      {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                        <p className="text-body-xs text-muted-foreground/60 mt-0.5">
                                          {entry.start_time || entry.startTime || '—'} &ndash; {entry.end_time || entry.endTime || '—'}
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
            )}
          </DataFetchWrapper>
        )}
      </div>
    </>
  );
}