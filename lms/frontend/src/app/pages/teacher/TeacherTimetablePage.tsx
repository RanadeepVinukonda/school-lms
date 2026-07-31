import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { timetableService } from '@/services/timetableService';
import { getAllSubjects, getAllTeachers } from '@/services/dataService';
import { formatClockTime } from '@/lib/format';
import api from '@/services/api';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

export default function TeacherTimetablePage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const DAYS = [_('Monday'), _('Tuesday'), _('Wednesday'), _('Thursday'), _('Friday'), _('Saturday')];
  const DAY_SHORT: Record<string, string> = {
    [_('Monday')]: _('Mon'), [_('Tuesday')]: _('Tue'), [_('Wednesday')]: _('Wed'),
    [_('Thursday')]: _('Thu'), [_('Friday')]: _('Fri'), [_('Saturday')]: _('Sat'),
  };
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: getAllSubjects,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: getAllTeachers,
  });

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const teachers = useMemo(() => teachersData || [], [teachersData]);
  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, { id: string; className: string }>();
    assignmentList.forEach(a => {
      if (!map.has(a.classId)) map.set(a.classId, { id: a.classId, className: a.className });
    });
    return Array.from(map.values());
  }, [assignmentList]);

  const { data: timetableRes, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const timetableEntries = ((timetableRes as any)?.data || []) as any[];

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

  const myEntries = useMemo(() => {
    if (!user?.id || !timetableEntries.length) return timetableEntries;
    return timetableEntries.filter((e: any) =>
      e.teacher_id === user.id || e.teacherId === user.id
    );
  }, [timetableEntries, user?.id]);

  const grid = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {};
    for (const day of DAYS) {
      map[day] = {};
    }
    for (const entry of myEntries) {
      const day = entry.day?.[0]?.toUpperCase() + entry.day?.slice(1)?.toLowerCase();
      if (map[day]) {
        const p = entry.period || 1;
        if (!map[day][p]) map[day][p] = [];
        map[day][p].push(entry);
      }
    }
    return map;
  }, [myEntries]);

  const periodNumbers = useMemo(() => {
    const nums = new Set<number>();
    for (const entry of myEntries) nums.add(entry.period || 1);
    return Array.from(nums).sort((a, b) => a - b);
  }, [myEntries]);

  return (
    <>
      <SEOHead title={_('My Timetable')} description={_('View your class schedule by period and day')} />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('My Timetable')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('View your assigned class schedule')}</p>
        </motion.div>

        {uniqueClasses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uniqueClasses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  selectedClassId === c.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-on-surface border-border hover:border-primary/50'
                }`}
              >
                {c.className}
              </button>
            ))}
          </div>
        )}

        {!selectedClassId ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground">
            <Icon name="calendar_month" size={64} className="text-muted-foreground/30 mb-3" />
            <p className="text-title-sm font-semibold">{_('Select a class to view your timetable')}</p>
            <p className="text-body-sm text-muted-foreground mt-1">{_('Choose a class from the buttons above')}</p>
          </div>
        ) : (
          <DataFetchWrapper
            data={myEntries}
            isLoading={isLoading}
            error={error ? new Error(_('Failed to load timetable')) : null}
            onRetry={refetch}
            loadingType="table"
            emptyMessage={_('No timetable entries found for your classes')}
          >
            {() => (
              <div className="border border-border/60 rounded-xl bg-surface overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-0 lg:min-w-0">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3.5 text-center w-20">{_('Period')}</th>
                        {DAYS.map((day) => (
                          <th key={day} className="px-4 py-3.5 text-center min-w-0">{DAY_SHORT[day] || day.slice(0, 3)}</th>
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
                                          {subjectMap.get(entry.subject_id || entry.subjectId || '') || entry.subject_id || entry.subjectId || _('Subject')}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-none flex items-center gap-1.5 truncate">
                                          <Icon name="person" size={10} className="text-muted-foreground/60 shrink-0" />
                                          {_('You')}
                                        </p>
                                        {entry.room && (
                                          <p className="text-[10px] text-muted-foreground leading-none flex items-center gap-1.5 truncate">
                                            <Icon name="meeting_room" size={10} className="text-muted-foreground/60 shrink-0" />
                                            <span className="truncate">{entry.room}</span>
                                          </p>
                                        )}
                                        {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                          <p className="text-[9px] text-muted-foreground/60 font-mono leading-none flex items-center gap-1.5 mt-0.5 border-t border-border/20 pt-1.5">
                                            <Icon name="schedule" size={10} className="text-muted-foreground/40 shrink-0" />
                                            <span>{formatClockTime(entry.start_time || entry.startTime, true) || '—'} &ndash; {formatClockTime(entry.end_time || entry.endTime, true) || '—'}</span>
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
