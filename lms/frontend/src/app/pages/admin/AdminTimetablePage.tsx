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
import { getAllClasses, getAllSubjects, getAllTeachers } from '@/services/dataService';
import type { TimetableEntry } from '@/services/timetableService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};
const MAX_PERIODS = 12;

interface PeriodRow {
  id: string;
  period: number;
  subjectId: string;
  teacherId: string;
  room: string;
  startTime: string;
  endTime: string;
}

function makeRow(period: number): PeriodRow {
  return { id: crypto.randomUUID(), period, subjectId: '', teacherId: '', room: '', startTime: '', endTime: '' };
}

export default function AdminTimetablePage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [nextPeriod, setNextPeriod] = useState(1);

  const { data: classesData = [] } = useQuery({ queryKey: ['admin-classes'], queryFn: getAllClasses });

  const { data: subjects = [] } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: getAllSubjects,
  });

  const filteredSubjects = useMemo(
    () => subjects.filter((s) => !s.classId || s.classId === selectedClassId),
    [subjects, selectedClassId],
  );

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: getAllTeachers,
  });

  const teachers = useMemo(() => teachersData || [], [teachersData]);

  const { data: allEntriesData } = useQuery({
    queryKey: ['timetable', selectedClassId],
    queryFn: () => timetableService.getByClass(selectedClassId).then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const allEntries = useMemo(() => (allEntriesData as TimetableEntry[] | undefined) || [], [allEntriesData]);

  const entriesByDayPeriod = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const e of allEntries) {
      const key = `${e.day}-${e.period}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [allEntries]);

  const { refetch: refetchDay } = useQuery({
    queryKey: ['timetable-day', selectedClassId, selectedDay],
    queryFn: () => timetableService.getByClassAndDay(selectedClassId, selectedDay).then((r) => r.data),
    enabled: false,
  });

  const initRows = useCallback((day: string) => {
    const dayEntries = allEntries.filter((e) => e.day === day).sort((a, b) => (a.period || 0) - (b.period || 0));
    if (dayEntries.length > 0) {
      setRows(dayEntries.map((e) => ({
        id: crypto.randomUUID(),
        period: e.period || 1,
        subjectId: e.subject_id || e.subjectId || '',
        teacherId: e.teacher_id || e.teacherId || '',
        room: e.room || '',
        startTime: e.start_time || e.startTime || '',
        endTime: e.end_time || e.endTime || '',
      })));
      setNextPeriod(Math.max(...dayEntries.map((e) => e.period || 0)) + 1);
    } else {
      setRows([makeRow(1)]);
      setNextPeriod(2);
    }
  }, [allEntries]);

  useEffect(() => {
    if (selectedDay) initRows(selectedDay);
  }, [selectedDay, initRows]);

  const addRow = () => {
    if (rows.length >= MAX_PERIODS) {
      toast.error(`Maximum ${MAX_PERIODS} periods allowed`);
      return;
    }
    setRows((prev) => [...prev, makeRow(nextPeriod)]);
    setNextPeriod((p) => p + 1);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof PeriodRow, value: string | number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const periods = rows.map((r) => ({
        period: r.period,
        subjectId: r.subjectId,
        teacherId: r.teacherId,
        room: r.room,
        startTime: r.startTime,
        endTime: r.endTime,
      }));
      return timetableService.saveDay({ classId: selectedClassId, day: selectedDay, periods });
    },
    onSuccess: () => {
      toast.success(`${selectedDay} timetable saved`);
      queryClient.refetchQueries({ queryKey: ['timetable', selectedClassId] });
      refetchDay();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save timetable'),
  });

  const hasEntries = allEntries.length > 0;
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

  const periodNumbers = useMemo(() => {
    const nums = new Set<number>();
    for (const e of allEntries) nums.add(e.period || 0);
    return Array.from(nums).sort((a, b) => a - b);
  }, [allEntries]);

  return (
    <>
      <SEOHead title="Timetable Management" description="Manage class timetables and scheduling" />
      <div className="sm:p-6 p-4 max-w-7xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Timetable Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Set up one day at a time — add periods and fill in the details</p>
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
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/30'
                            : 'border-border/60 bg-card text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span>{day}</span>
                        {dayEntryCount > 0 && (
                          <Badge variant="outline" className={`ml-2 text-[10px] ${isActive ? 'border-primary-foreground/40 text-primary-foreground' : ''}`}>
                            {dayEntryCount}
                          </Badge>
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
                    <Button variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_PERIODS}>
                      <Icon name="add" size={16} className="mr-1" />
                      Add Period
                    </Button>
                    <Button
                      onClick={() => saveMutation.mutate()}
                      loading={saveMutation.isPending}
                      disabled={rows.length === 0}
                    >
                      <Icon name="save" size={16} className="mr-1.5" />
                      Save {selectedDay}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-3 py-2.5 text-center w-14">#</th>
                        <th className="px-3 py-2.5">Subject</th>
                        <th className="px-3 py-2.5">Teacher</th>
                        <th className="px-3 py-2.5 w-20">Room</th>
                        <th className="px-3 py-2.5 w-28">Start</th>
                        <th className="px-3 py-2.5 w-28">End</th>
                        <th className="px-3 py-2.5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-2 text-center">
                            <select
                              className="h-9 w-16 rounded-lg border border-border/60 bg-surface text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                              value={row.period}
                              onChange={(e) => updateRow(row.id, 'period', Number(e.target.value))}
                            >
                              {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="h-9 w-full rounded-lg border border-border/60 bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              value={row.subjectId}
                              onChange={(e) => updateRow(row.id, 'subjectId', e.target.value)}
                            >
                              <option value="">Select subject</option>
                              {filteredSubjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="h-9 w-full rounded-lg border border-border/60 bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              value={row.teacherId}
                              onChange={(e) => updateRow(row.id, 'teacherId', e.target.value)}
                            >
                              <option value="">Select teacher</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>{t.display_name || t.email}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              placeholder="Room"
                              value={row.room}
                              onChange={(e) => updateRow(row.id, 'room', e.target.value)}
                              className="h-9 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="time"
                              value={row.startTime}
                              onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                              className="h-9 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="time"
                              value={row.endTime}
                              onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                              className="h-9 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className="p-1.5 rounded hover:bg-error/10 text-muted-foreground hover:text-error transition-colors"
                              onClick={() => removeRow(row.id)}
                              title="Remove period"
                            >
                              <Icon name="delete" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      <p className="text-body-sm">No periods added yet</p>
                      <Button size="sm" className="mt-2" onClick={addRow}>
                        <Icon name="add" size={16} className="mr-1" />
                        Add First Period
                      </Button>
                    </div>
                  )}
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
                    <p className="text-body-sm text-muted-foreground mt-1">Select a day above and add periods</p>
                  </div>
                ) : (
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider w-16 text-center">Period</th>
                        {DAYS.map((day) => (
                          <th key={day} className="px-3 py-3 text-label-sm font-bold text-muted-foreground uppercase tracking-wider text-center">{DAY_SHORT[day]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {periodNumbers.map((period) => (
                        <tr key={period} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-3 font-semibold text-muted-foreground text-center align-middle text-label-sm">{period}</td>
                          {DAYS.map((day) => {
                            const entries = entriesByDayPeriod.get(`${day}-${period}`) || [];
                            return (
                              <td key={day} className="px-2 py-2 align-top min-w-[150px]">
                                {entries.length === 0 ? (
                                  <div className="h-full min-h-[72px] flex items-center justify-center">
                                    <span className="text-muted-foreground/20 select-none text-label-xs">&mdash;</span>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {entries.map((entry) => (
                                      <div
                                        key={entry.id}
                                        className="rounded-lg border border-border/60 bg-surface p-2.5 shadow-sm"
                                      >
                                        <p className="text-label-sm font-semibold text-foreground truncate">
                                          {subjectMap.get(entry.subject_id || entry.subjectId || '') || entry.subject_id || entry.subjectId || '—'}
                                        </p>
                                        {(entry.teacher_id || entry.teacherId) && (
                                          <p className="text-label-xs text-muted-foreground mt-0.5 truncate">
                                            {teacherMap.get(entry.teacher_id || entry.teacherId || '') || entry.teacher_id || entry.teacherId}
                                          </p>
                                        )}
                                        {entry.room && (
                                          <Badge variant="outline" className="text-[10px] mt-1 py-0 h-4 px-1.5">
                                            <Icon name="meeting_room" size={10} className="mr-0.5" />
                                            {entry.room}
                                          </Badge>
                                        )}
                                        {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                          <p className="text-label-xs text-muted-foreground/70 mt-1 font-mono">
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
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}