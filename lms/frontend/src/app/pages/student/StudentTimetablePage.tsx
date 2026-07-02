import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { timetableService } from '@/services/timetableService';
import { getAllClasses } from '@/services/dataService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = Array.from({ length: 9 }, (_, i) => i + 1);

export default function StudentTimetablePage() {
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: classesData = [] } = useQuery({
    queryKey: ['student-classes'],
    queryFn: getAllClasses,
  });

  const { data: timetableRes, isLoading, error, refetch } = useQuery({
    queryKey: ['student-timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const timetableEntries = (timetableRes as any)?.data as any[] | undefined;

  const classOptions = useMemo(
    () => classesData.map((c: any) => ({ value: c.id, label: c.name })),
    [classesData],
  );

  const grid = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {};
    for (const day of DAYS) {
      map[day] = {};
      for (const p of PERIODS) {
        map[day][p] = [];
      }
    }
    for (const entry of timetableEntries ?? []) {
      const day = entry.day?.[0]?.toUpperCase() + entry.day?.slice(1)?.toLowerCase();
      if (map[day] && map[day][entry.period]) {
        map[day][entry.period].push(entry);
      }
    }
    return map;
  }, [timetableEntries]);

  return (
    <>
      <SEOHead title="Timetable" description="View your class timetable by period and day" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Timetable</h1>
          <p className="text-body-md text-muted-foreground mt-1">View class timetable by period, day, and subject</p>
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
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="px-3 py-3 text-center w-16">Period</th>
                      {DAYS.map((day) => (
                        <th key={day} className="px-3 py-3 text-center">{day.slice(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-title-sm">
                    {PERIODS.map((period) => (
                      <tr key={period} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2 text-center font-bold text-muted-foreground text-label-sm">
                          {period}
                        </td>
                        {DAYS.map((day) => {
                          const entries = grid[day]?.[period] ?? [];
                          return (
                            <td key={`${day}-${period}`} className="px-2 py-2 align-top">
                              {entries.length === 0 ? (
                                <span className="text-muted-foreground/30 text-label-xs block text-center">&mdash;</span>
                              ) : (
                                <div className="space-y-1">
                                  {entries.map((entry: any) => (
                                    <div
                                      key={entry.id}
                                      className="bg-primary-container/50 rounded-lg p-2 border border-primary/20"
                                    >
                                      <p className="text-label-sm font-semibold truncate text-primary">
                                        {entry.subject_id || 'Subject'}
                                      </p>
                                      {entry.teacher_id && (
                                        <p className="text-[10px] text-muted-foreground truncate">
                                          {entry.teacher_id}
                                        </p>
                                      )}
                                      {entry.room && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <Badge variant="outline" className="text-[9px] py-0 h-4 px-1">
                                            <Icon name="meeting_room" size={10} className="mr-0.5" />
                                            {entry.room}
                                          </Badge>
                                        </div>
                                      )}
                                      {entry.start_time && entry.end_time && (
                                        <p className="text-[9px] text-muted-foreground mt-0.5">
                                          {entry.start_time} &ndash; {entry.end_time}
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
