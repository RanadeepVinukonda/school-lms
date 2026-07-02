import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { timetableService } from '@/services/timetableService';
import { getAllClasses } from '@/services/dataService';
import type { TimetableEntry } from '@/services/timetableService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

function emptyPeriod() {
  return { subjectId: '', teacherId: '', room: '', startTime: '', endTime: '' };
}

const dayColors: Record<string, string> = {
  Monday: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
  Tuesday: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  Wednesday: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300',
  Thursday: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300',
  Friday: 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
  Saturday: 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300',
};

export default function AdminTimetablePage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [periodForms, setPeriodForms] = useState<Record<number, ReturnType<typeof emptyPeriod>>>({});

  const { data: classesData = [] } = useQuery({ queryKey: ['admin-classes'], queryFn: getAllClasses });

  const { data: allEntriesData } = useQuery({
    queryKey: ['timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const allEntries = useMemo(() => (allEntriesData as TimetableEntry[] | undefined) || [], [allEntriesData]);

  const entriesMap = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    for (const e of allEntries) {
      map.set(`${e.day}-${e.period}`, e);
    }
    return map;
  }, [allEntries]);

  const {
    data: dayData,
    refetch: refetchDay,
  } = useQuery({
    queryKey: ['timetable-day', selectedClassId, selectedDay],
    queryFn: () => timetableService.getByClassAndDay(selectedClassId, selectedDay).then((r) => r.data),
    enabled: !!selectedClassId && !!selectedDay,
  });

  const dayEntries = useMemo(() => (dayData as TimetableEntry[] | undefined) || [], [dayData]);

  const loadDay = useCallback((day: string) => {
    setSelectedDay(day);
  }, []);

  const initForm = useCallback(() => {
    const forms: Record<number, ReturnType<typeof emptyPeriod>> = {};
    for (const p of PERIODS) {
      const existing = dayEntries.find((e) => e.period === p);
      forms[p] = {
        subjectId: existing?.subject_id || existing?.subjectId || '',
        teacherId: existing?.teacher_id || existing?.teacherId || '',
        room: existing?.room || '',
        startTime: existing?.start_time || existing?.startTime || '',
        endTime: existing?.end_time || existing?.endTime || '',
      };
    }
    setPeriodForms(forms);
  }, [dayEntries]);

  useEffect(() => { if (selectedDay && dayEntries.length >= 0) initForm(); }, [selectedDay, dayEntries, initForm]);

  const updateField = (period: number, field: string, value: string) => {
    setPeriodForms((prev) => ({
      ...prev,
      [period]: { ...(prev[period] || emptyPeriod()), [field]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const periods = PERIODS.map((p) => ({
        period: p,
        ...(periodForms[p] || emptyPeriod()),
      }));
      return timetableService.saveDay({ classId: selectedClassId, day: selectedDay, periods });
    },
    onSuccess: () => {
      toast.success(`${selectedDay} timetable saved`);
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedClassId] });
      refetchDay();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save timetable'),
  });

  const hasEntries = allEntries.length > 0;

  return (
    <>
      <SEOHead title="Timetable Management" description="Manage class timetables and scheduling" />
      <div className="sm:p-6 p-4 max-w-7xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Timetable Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Set up one day at a time — fill all periods and save</p>
        </motion.div>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-title-sm">Select Class</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-80"
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setSelectedDay(''); }}
            >
              <option value="">Select a class to manage timetable</option>
              {classesData.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedClassId && (
          <>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">Select Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const dayEntryCount = allEntries.filter((e) => e.day === day).length;
                    const isActive = selectedDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => loadDay(day)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          isActive
                            ? dayColors[day] + ' shadow-sm ring-2 ring-offset-1 ring-offset-background'
                            : 'border-border/60 bg-card text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span>{day}</span>
                        {dayEntryCount > 0 && (
                          <Badge variant="outline" className="ml-2 text-[10px]">{dayEntryCount}/8</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedDay && (
              <Card className="border-border/60">
                <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-title-sm">
                      Editing <span className="font-bold">{selectedDay}</span>
                    </CardTitle>
                    {saveMutation.isPending && (
                      <span className="text-label-sm text-muted-foreground animate-pulse">Saving...</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      loading={saveMutation.isPending}
                    >
                      <Icon name="save" size={16} className="mr-1.5" />
                      Save {selectedDay}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-3 py-2.5 text-center w-14">#</th>
                        <th className="px-3 py-2.5">Subject</th>
                        <th className="px-3 py-2.5">Teacher</th>
                        <th className="px-3 py-2.5 w-20">Room</th>
                        <th className="px-3 py-2.5 w-28">Start</th>
                        <th className="px-3 py-2.5 w-28">End</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {PERIODS.map((period) => {
                        const f = periodForms[period] || emptyPeriod();
                        return (
                          <tr key={period} className="hover:bg-muted/10 transition-colors">
                            <td className="px-3 py-2 text-center font-bold text-muted-foreground">
                              {period}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                placeholder="Subject name or ID"
                                value={f.subjectId}
                                onChange={(e) => updateField(period, 'subjectId', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                placeholder="Teacher name or ID"
                                value={f.teacherId}
                                onChange={(e) => updateField(period, 'teacherId', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                placeholder="Room"
                                value={f.room}
                                onChange={(e) => updateField(period, 'room', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="time"
                                value={f.startTime}
                                onChange={(e) => updateField(period, 'startTime', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="time"
                                value={f.endTime}
                                onChange={(e) => updateField(period, 'endTime', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">Week View</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {!hasEntries ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Icon name="calendar_month" size={48} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-title-sm font-semibold">No timetable entries yet</p>
                    <p className="text-body-sm text-muted-foreground mt-1">Select a day above and fill in the periods</p>
                  </div>
                ) : (
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30">
                        <th className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider w-16">Period</th>
                        {DAYS.map((day) => (
                          <th key={day} className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider text-center">{DAY_SHORT[day]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {PERIODS.map((period) => (
                        <tr key={period} className="hover:bg-muted/10">
                          <td className="px-3 py-2.5 font-semibold text-muted-foreground text-center align-middle">{period}</td>
                          {DAYS.map((day) => {
                            const entry = entriesMap.get(`${day}-${period}`);
                            return (
                              <td key={day} className="px-2 py-2 align-top min-w-[140px]">
                                {entry ? (
                                  <div className="rounded-lg border border-border/60 bg-card p-2.5 shadow-sm">
                                    <Badge variant="info" className="text-[11px] leading-tight max-w-[100px] truncate">
                                      {entry.subject_id || entry.subjectId || '—'}
                                    </Badge>
                                    {(entry.teacher_id || entry.teacherId) && (
                                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{entry.teacher_id || entry.teacherId}</p>
                                    )}
                                    {entry.room && (
                                      <p className="text-[11px] text-muted-foreground truncate">Room {entry.room}</p>
                                    )}
                                    {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                      <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                                        {entry.start_time || entry.startTime || '—'} – {entry.end_time || entry.endTime || '—'}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[72px] flex items-center justify-center">
                                    <span className="text-[11px] text-muted-foreground/20 select-none">—</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}