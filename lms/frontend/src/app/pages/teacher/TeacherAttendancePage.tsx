import { useState, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OptionsSelect } from '@/components/ui/select';
import { attendanceService } from '@/services/attendanceService';
import { getStudentsByClass } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export default function TeacherAttendancePage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || '';
  const [tab, setTab] = useState('mark');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late' | 'holiday'>('present');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: teacherClasses = [] } = useQuery({
    queryKey: ['teacher-classes', userId],
    queryFn: async () => {
      const res = await api.get('/teacher-class-subject/my');
      const assignments = res.data?.data || [];
      const seen = new Map<string, { id: string; name: string }>();
      for (const a of assignments) {
        if (!seen.has(a.classId)) {
          seen.set(a.classId, { id: a.classId, name: a.className || a.classId });
        }
      }
      return Array.from(seen.values());
    },
    enabled: !!userId,
  });

  const { data: classStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-class-students', selectedClass],
    queryFn: () => getStudentsByClass(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: todayAttendanceRecords = [] } = useQuery({
    queryKey: ['teacher-today-attendance', selectedClass, selectedDate],
    queryFn: async () => {
      const res = await attendanceService.getClassAttendance(selectedClass, selectedDate);
      return res.data || [];
    },
    enabled: !!selectedClass && !!selectedDate && tab === 'mark',
  });

  const alreadyMarkedIds = useMemo(() => new Set(todayAttendanceRecords.map((r: any) => r.studentId)), [todayAttendanceRecords]);
  const studentAttendanceStatus = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of todayAttendanceRecords) {
      map[r.studentId] = r.status;
    }
    return map;
  }, [todayAttendanceRecords]);

  const { data: reportData, isLoading: reportLoading, isError: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['teacher-attendance-report', selectedClass],
    queryFn: () => attendanceService.getAttendanceReport(selectedClass).then((r) => r.data),
    enabled: !!selectedClass,
  });

  const markMutation = useMutation({
    mutationFn: (data: { studentIds: string[]; classId: string; date: string; status: 'present' | 'absent' | 'late' | 'holiday'; markedBy: string }) =>
      attendanceService.markAttendance(data),
    onSuccess: (res: any) => {
      if (res?.skipped) {
        toast.info(_('Attendance already recorded for selected students'));
      } else {
        toast.success(_('Attendance marked'));
      }
      setSelectedStudentIds([]);
      queryClient.invalidateQueries({ queryKey: ['teacher-today-attendance', selectedClass, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance-report'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
    },
    onError: (err: any) => toast.error(err.message || _('Failed to mark attendance')),
  });

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleMarkSelected = () => {
    if (!selectedClass || !selectedDate) {
      toast.error(_('Select a class and date'));
      return;
    }
    const newIds = selectedStudentIds.filter((id) => !alreadyMarkedIds.has(id));
    if (newIds.length === 0) {
      toast.info(_('Attendance already recorded for all selected students'));
      return;
    }
    markMutation.mutate({ studentIds: newIds, classId: selectedClass, date: selectedDate, status: attendanceStatus, markedBy: userId });
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'late' | 'holiday') => {
    if (!selectedClass || !selectedDate) return;
    const ids = classStudents.map((s: any) => s.id).filter(Boolean);
    const newIds = ids.filter((id: string) => !alreadyMarkedIds.has(id));
    if (newIds.length === 0) {
      toast.info(_('Attendance already recorded for all students'));
      return;
    }
    markMutation.mutate({ studentIds: newIds, classId: selectedClass, date: selectedDate, status, markedBy: userId });
  };


  return (
    <>
      <SEOHead title={_('Attendance')} description={_('Manage class attendance')} />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md font-bold tracking-tight">{_('Attendance')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('Record daily attendance for your classes')}</p>
        </motion.div>

        <div className="flex gap-3 items-center flex-wrap">
          <select
            className="h-10 flex-1 min-w-[200px] px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">{_('Select your class...')}</option>
            {teacherClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
          </select>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
        </div>

        {selectedClass && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full overflow-x-auto inline-flex">
              <TabsTrigger value="mark">{_('Mark')}</TabsTrigger>
              <TabsTrigger value="report">{_('Report')}</TabsTrigger>
            </TabsList>

            <TabsContent value="mark" className="space-y-6">
              <div className="flex gap-3 items-center flex-wrap">
                <OptionsSelect
                  options={[
                    { value: 'present', label: _('Present') },
                    { value: 'absent', label: _('Absent') },
                    { value: 'late', label: _('Late') },
                    { value: 'holiday', label: _('Holiday') },
                  ]}
                  value={attendanceStatus}
                  onChange={(v: string) => setAttendanceStatus(v as any)}
                  className="w-36"
                />
                <Button onClick={handleMarkSelected} loading={markMutation.isPending}>
                  <Icon name="check" size={16} className="mr-1.5" />
                  {_('Mark Selected')}
                </Button>
                <Button variant="outline" onClick={() => handleMarkAll('present')}>{_('All Present')}</Button>
                <Button variant="destructive" onClick={() => handleMarkAll('absent')}>{_('All Absent')}</Button>
              </div>

              <Card className="border-border/60">
                <CardContent className="p-0">
                  {studentsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
                    </div>
                  ) : classStudents.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                      <Icon name="search_off" size={48} className="opacity-50" />
                      <p className="text-title-sm font-semibold">{_('No students in this class')}</p>
                    </div>
                  ) : (
                    <div className="border border-border/60 rounded-xl overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="px-4 py-3 w-10">#</th>
                            <th className="px-4 py-3">{_('Roll No')}</th>
                            <th className="px-4 py-3">{_('Student Name')}</th>
                            <th className="px-4 py-3 text-center">{_('Daily')}</th>
                            <th className="px-4 py-3 text-center">{_('Monthly')}</th>
                            <th className="px-4 py-3 text-center">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 text-title-sm">
                          {classStudents.map((s: any, idx: number) => {
                            const alreadyMarked = alreadyMarkedIds.has(s.id);
                            const status = studentAttendanceStatus[s.id];
                            const studentSummary = reportData?.summary?.[s.id];
                            const pct = studentSummary?.percentage ?? (studentSummary && studentSummary.total > 0 ? Math.round((studentSummary.present / studentSummary.total) * 100) : null);
                            return (
                              <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${alreadyMarked ? 'bg-muted/30' : selectedStudentIds.includes(s.id) ? 'bg-primary/5' : ''}`}>
                                <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                <td className="px-4 py-3 font-mono text-muted-foreground">{s.rollNo ?? '-'}</td>
                                <td className="px-4 py-3 font-semibold">{s.displayName || s.email}</td>
                                <td className="px-4 py-3 text-center">
                                  {alreadyMarked ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      status === 'present' ? 'bg-success-container text-success' :
                                      status === 'absent' ? 'bg-error-container text-error' :
                                      status === 'late' ? 'bg-warning-container text-warning' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {status}
                                    </span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="rounded border-border"
                                      checked={selectedStudentIds.includes(s.id)}
                                      onChange={() => toggleStudent(s.id)}
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-label-sm text-muted-foreground">
                                  {studentSummary ? (
                                    <span className="text-[10px]">
                                      P:{studentSummary.present} A:{studentSummary.absent} L:{studentSummary.late} H:{studentSummary.holiday}
                                    </span>
                                  ) : (
                                    <span>&mdash;</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-label-sm font-mono">
                                  {pct !== null ? (
                                    <span className={`font-bold ${pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-error'}`}>
                                      {pct}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">&mdash;</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="space-y-6">
              <DataFetchWrapper data={reportData} isLoading={reportLoading} error={reportError ? new Error('Failed to load report') : null} onRetry={refetchReport} loadingType="card">
                {() => (
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-title-sm">{_('Attendance Summary')}</CardTitle>
                        {reportData?.yearStart && (
                          <span className="text-label-sm text-muted-foreground">
                            {_('From')} {new Date(reportData.yearStart).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(!reportData?.summary || Object.keys(reportData.summary).length === 0) ? (
                        <p className="text-muted-foreground text-center py-8">{_('No records found')}</p>
                      ) : (
                        <div className="border border-border/60 rounded-xl overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">{_('Student')}</th>
                                <th className="px-4 py-3 text-center">{_('Present')}</th>
                                <th className="px-4 py-3 text-center">{_('Absent')}</th>
                                <th className="px-4 py-3 text-center">{_('Late')}</th>
                                <th className="px-4 py-3 text-center">{_('Holiday')}</th>
                                <th className="px-4 py-3 text-center">{_('Total')}</th>
                                <th className="px-4 py-3 text-center">%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 text-title-sm">
                              {(Object.entries(reportData.summary) as [string, any][]).sort(([, a], [, b]) => (a.rollNo || '').localeCompare(b.rollNo || '')).map(([studentId, data], idx: number) => {
                                const pct = data.percentage ?? (data.total > 0 ? Math.round((data.present / data.total) * 100) : 0);
                                return (
                                  <tr key={studentId} className="hover:bg-muted/20">
                                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                    <td className="px-4 py-3 font-semibold">{data.studentName || studentId.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-center font-mono text-success">{data.present}</td>
                                    <td className="px-4 py-3 text-center font-mono text-error">{data.absent}</td>
                                    <td className="px-4 py-3 text-center font-mono text-warning">{data.late}</td>
                                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">{data.holiday}</td>
                                    <td className="px-4 py-3 text-center font-mono">{data.total}</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold">{pct}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </DataFetchWrapper>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
}
