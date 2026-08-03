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
import { getAllSubjects, getAllTeachers } from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import ClassSelect from '@/components/common/ClassSelect';
import { formatClockTime } from '@/lib/format';
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

  const { data: tcAssignments } = useQuery({
    queryKey: ['timetable-tc-assignments'],
    queryFn: () => teacherClassSubjectService.getAll().then((r) => r.data),
    enabled: !!selectedClassId,
  });

  const subjectTeacherMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of (tcAssignments || [])) {
      if (a.classId && a.subjectId && a.teacherId) {
        m.set(`${a.classId}|${a.subjectId}`, a.teacherId);
      }
    }
    return m;
  }, [tcAssignments]);

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
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
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
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon name="calendar_view_week" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Timetable Management</h1>
              <p className="text-body-sm text-muted-foreground">Set up class schedules — add periods, assign subjects and teachers</p>
            </div>
          </div>
        </motion.div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-title-sm flex items-center gap-2">
              <Icon name="school" size={18} className="text-primary" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClassSelect
              className="h-11 px-4 rounded-xl border border-border/50 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary w-full sm:w-96 text-sm font-medium cursor-pointer"
              placeholder="— Choose a class —"
              value={selectedClassId}
              onChange={(v) => { setSelectedClassId(v); setSelectedDay(''); }}
            />
          </CardContent>
        </Card>

        {selectedClassId && (
          <>
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-title-sm">Select Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {DAYS.map((day) => {
                    const dayEntryCount = allEntries.filter((e) => e.day === day).length;
                    const isActive = selectedDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`flex items-center justify-between gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30 scale-[1.02]'
                            : 'border-border/50 bg-card text-foreground hover:bg-muted/40 hover:border-primary/30 shadow-sm'
                        }`}
                      >
                        <span>{day}</span>
                        {dayEntryCount > 0 && (
                          <Badge variant={isActive ? 'secondary' : 'outline'} className={`text-[10px] shrink-0 ${isActive ? 'bg-primary-foreground/20 text-primary-foreground border-0' : ''}`}>
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
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-4 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon name="edit_calendar" size={18} className="text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-title-sm">
                        Editing <span className="font-bold text-primary">{selectedDay}</span>
                      </CardTitle>
                      <p className="text-label-xs text-muted-foreground mt-0.5">Set periods, subjects, teachers, and timings</p>
                    </div>
                    {saveMutation.isPending && (
                      <span className="text-label-sm text-muted-foreground animate-pulse ml-2">Saving...</span>
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
                <CardContent className="p-0 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-0 lg:min-w-0">
                      <thead>
                        <tr className="border-b-2 border-border/60 bg-muted/40 text-label-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
                          <th className="px-4 py-3.5 text-center w-16">#</th>
                          <th className="px-4 py-3.5 w-[22%]">Subject</th>
                          <th className="px-4 py-3.5 w-[22%]">Teacher</th>
                          <th className="px-4 py-3.5 w-20">Room</th>
                          <th className="px-4 py-3.5 w-28">Start</th>
                          <th className="px-4 py-3.5 w-28">End</th>
                          <th className="px-4 py-3.5 w-14"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {rows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-muted/10 transition-colors group">
                            <td className="px-3 py-3 text-center align-middle">
                              <select
                                className="h-10 w-full rounded-lg border border-border/50 bg-surface text-foreground text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                                value={row.period}
                                onChange={(e) => updateRow(row.id, 'period', Number(e.target.value))}
                              >
                                {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((p) => (
                                  <option key={p} value={p}>P{p}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <select
                                className="h-10 w-full rounded-lg border border-border/50 bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                                value={row.subjectId}
                                onChange={(e) => {
                                  const subjectId = e.target.value;
                                  const autoTeacher = subjectId ? subjectTeacherMap.get(`${selectedClassId}|${subjectId}`) || '' : '';
                                  updateRow(row.id, 'subjectId', subjectId);
                                  if (autoTeacher) updateRow(row.id, 'teacherId', autoTeacher);
                                }}
                              >
                                <option value="">— Select subject —</option>
                                {filteredSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <select
                                className="h-10 w-full rounded-lg border border-border/50 bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                                value={row.teacherId}
                                onChange={(e) => updateRow(row.id, 'teacherId', e.target.value)}
                              >
                                <option value="">— Select teacher —</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>{t.display_name || t.email}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <Input
                                placeholder="e.g. 101"
                                value={row.room}
                                onChange={(e) => updateRow(row.id, 'room', e.target.value)}
                                className="h-10 text-sm"
                              />
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <Input
                                type="time"
                                value={row.startTime}
                                onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                                className="h-10 text-sm"
                              />
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <Input
                                type="time"
                                value={row.endTime}
                                onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                                className="h-10 text-sm"
                              />
                            </td>
                            <td className="px-3 py-3 text-center align-middle">
                              <button
                                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error/10 text-muted-foreground hover:text-error transition-all focus:opacity-100"
                                onClick={() => removeRow(row.id)}
                                title="Remove period"
                              >
                                <Icon name="delete" size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                      <Icon name="schedule" size={48} className="mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-title-sm font-semibold">No periods added yet</p>
                      <p className="text-body-sm text-muted-foreground mt-1">Click "Add Period" to start building the timetable</p>
                      <Button size="sm" className="mt-4" onClick={addRow}>
                        <Icon name="add" size={16} className="mr-1" />
                        Add First Period
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-title-sm flex items-center gap-2">
                  <Icon name="calendar_view_week" size={18} className="text-primary" />
                  Week View
                </CardTitle>
              </CardHeader>
                <CardContent className="p-0 sm:p-5">
                  {!hasEntries ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Icon name="calendar_month" size={48} className="mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-title-sm font-semibold">No timetable entries yet</p>
                      <p className="text-body-sm text-muted-foreground mt-1">Select a day above and add periods</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                      <table className="w-full text-left min-w-0 lg:min-w-0">
                        <thead>
                          <tr className="border-b-2 border-border/60 bg-muted/40 sticky top-0 z-10">
                            <th className="px-4 py-3.5 text-center w-20 text-label-xs font-bold text-muted-foreground uppercase tracking-wider">Period</th>
                            {DAYS.map((day) => (
                              <th key={day} className="px-4 py-3.5 text-center min-w-0 text-label-xs font-bold text-muted-foreground uppercase tracking-wider">{DAY_SHORT[day]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {periodNumbers.map((period) => (
                            <tr key={period} className="hover:bg-muted/5 transition-colors">
                              <td className="px-4 py-4 text-center align-middle">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  {period}
                                </span>
                              </td>
                              {DAYS.map((day) => {
                                const entries = entriesByDayPeriod.get(`${day}-${period}`) || [];
                                return (
                                  <td key={day} className="px-2 py-3 align-top">
                                    {entries.length === 0 ? (
                                      <div className="min-h-[80px] flex items-center justify-center rounded-xl border border-dashed border-border/20 bg-muted/5">
                                        <span className="text-muted-foreground/15 select-none text-lg">&mdash;</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {entries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 hover:border-primary/30 transition-all shadow-sm"
                                          >
                                            <p className="text-sm font-bold text-primary leading-snug break-words">
                                              {subjectMap.get(entry.subject_id || entry.subjectId || '') || entry.subject_id || entry.subjectId || '—'}
                                            </p>
                                            {(entry.teacher_id || entry.teacherId) && (
                                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                                <Icon name="person" size={12} className="text-muted-foreground/50 shrink-0" />
                                                <span className="break-words">{teacherMap.get(entry.teacher_id || entry.teacherId || '') || '—'}</span>
                                              </p>
                                            )}
                                            {entry.room && (
                                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                <Icon name="meeting_room" size={12} className="text-muted-foreground/50 shrink-0" />
                                                <span className="break-words">{entry.room}</span>
                                              </p>
                                            )}
                                            {(entry.start_time || entry.startTime || entry.end_time || entry.endTime) && (
                                              <p className="text-[11px] text-muted-foreground/60 font-mono mt-2 pt-2 border-t border-border/20 flex items-center gap-1.5">
                                                <Icon name="schedule" size={11} className="text-muted-foreground/40 shrink-0" />
                                                <span>{formatClockTime(entry.start_time || entry.startTime) || '—'} &ndash; {formatClockTime(entry.end_time || entry.endTime) || '—'}</span>
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
                </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}