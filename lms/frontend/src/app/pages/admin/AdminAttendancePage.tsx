import { useState, useMemo } from 'react';
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
import { getAllClasses, getAllUsers } from '@/services/dataService';

export default function AdminAttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late' | 'holiday'>('present');
  const [studentSearch, setStudentSearch] = useState('');

  const { data: classesData = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: getAllClasses,
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAllUsers,
  });

  const students = useMemo(() => usersData.filter((u) => u.role === 'student'), [usersData]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((s) => {
      const matchesClass = s.classId === selectedClass || (s.classIds && s.classIds.includes(selectedClass));
      if (!studentSearch) return matchesClass;
      const q = studentSearch.toLowerCase();
      return matchesClass && (s.displayName?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q));
    });
  }, [students, selectedClass, studentSearch]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: attendanceData, isLoading: attLoading, isError: attError, refetch: refetchAtt } = useQuery({
    queryKey: ['class-attendance', selectedClass, selectedDate],
    queryFn: () => attendanceService.getClassAttendance(selectedClass, selectedDate).then((r) => r.data),
    enabled: !!selectedClass && activeTab === 'overview',
  });

  const { data: reportData, isLoading: reportLoading, isError: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['attendance-report', selectedClass],
    queryFn: () => attendanceService.getAttendanceReport(selectedClass).then((r) => r.data),
    enabled: !!selectedClass && activeTab === 'report',
  });

  const markMutation = useMutation({
    mutationFn: (data: { studentIds: string[]; classId: string; date: string; status: 'present' | 'absent' | 'late' | 'holiday'; markedBy: string; note?: string }) =>
      attendanceService.markAttendance(data),
    onSuccess: () => {
      toast.success('Attendance marked successfully');
      setSelectedStudentIds([]);
      refetchAtt();
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to mark attendance'),
  });

  const handleMarkAll = (status: 'present' | 'absent' | 'late' | 'holiday') => {
    if (!selectedClass || !selectedDate) {
      toast.error('Select a class and date first');
      return;
    }
    const ids = classStudents.map((s) => s.id).filter(Boolean) as string[];
    if (ids.length === 0) {
      toast.error('No students in this class');
      return;
    }
    markMutation.mutate({ studentIds: ids, classId: selectedClass, date: selectedDate, status, markedBy: 'admin' });
  };

  const handleMarkSelected = () => {
    if (!selectedClass || !selectedDate) {
      toast.error('Select a class and date first');
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    markMutation.mutate({ studentIds: selectedStudentIds, classId: selectedClass, date: selectedDate, status: attendanceStatus, markedBy: 'admin' });
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const todayAttendance = useMemo(() => {
    if (!attendanceData) return { present: 0, absent: 0, late: 0, holiday: 0 };
    return (attendanceData as any[]).reduce((acc: any, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, { present: 0, absent: 0, late: 0, holiday: 0 });
  }, [attendanceData]);

  return (
    <>
      <SEOHead title="Attendance Management" description="Track student and teacher attendance" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Attendance Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Track and manage attendance records</p>
        </motion.div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              className="h-10 w-full pl-10 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Select a class...</option>
              {classesData.map((c) => (
                <option key={c.id} value={c.id}>{c.grade && c.section ? `Class ${c.grade}-${c.section}` : c.name}</option>
              ))}
            </select>
          </div>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="overview">Class Overview</TabsTrigger>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="report">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {!selectedClass ? (
              <Card className="border-border/60">
                <CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                  <Icon name="event" size={48} className="opacity-50" />
                  <p className="text-title-sm font-semibold">Select a class and date to view attendance</p>
                </CardContent>
              </Card>
            ) : (
              <DataFetchWrapper
                data={attendanceData}
                isLoading={attLoading}
                error={attError ? new Error('Failed to load attendance') : null}
                onRetry={refetchAtt}
                loadingType="card"
              >
                {() => (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      {Object.entries(todayAttendance).map(([status, count]) => (
                        <Card key={status} className="border-border/60">
                          <CardContent className="p-4 text-center">
                            <p className="text-label-sm text-muted-foreground capitalize">{status}</p>
                            <p className="text-display-xs font-bold mt-1">{count as number}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Attendance Records for {selectedDate}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(attendanceData as any[])?.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No attendance records for this date</p>
                        ) : (
                          <div className="border border-border/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  <th className="px-4 py-3">Student</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Marked By</th>
                                  <th className="px-4 py-3">Note</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 text-title-sm">
                                {(attendanceData as any[])?.map((r: any) => {
                                  const student = usersData.find((u) => u.id === r.studentId);
                                  return (
                                    <tr key={r.id} className="hover:bg-muted/20">
                                      <td className="px-4 py-3 font-semibold">{student?.displayName || r.studentId}</td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                          r.status === 'present' ? 'bg-success-container text-success' :
                                          r.status === 'absent' ? 'bg-error-container text-error' :
                                          r.status === 'late' ? 'bg-warning-container text-warning' :
                                          'bg-muted text-muted-foreground'
                                        }`}>
                                          <Icon name={
                                            r.status === 'present' ? 'check_circle' :
                                            r.status === 'absent' ? 'cancel' :
                                            r.status === 'late' ? 'schedule' : 'holiday_village'
                                          } size={14} />
                                          {r.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground">{r.markedBy}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{r.note || '-'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </DataFetchWrapper>
            )}
          </TabsContent>

          <TabsContent value="mark" className="space-y-6">
            {!selectedClass ? (
              <Card className="border-border/60">
                <CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                  <Icon name="group_add" size={48} className="opacity-50" />
                  <p className="text-title-sm font-semibold">Select a class and date to mark attendance</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-3 items-center flex-wrap">
                  <Input
                    placeholder="Search students..."
                    className="w-64"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <OptionsSelect
                    options={[
                      { value: 'present', label: 'Present' },
                      { value: 'absent', label: 'Absent' },
                      { value: 'late', label: 'Late' },
                      { value: 'holiday', label: 'Holiday' },
                    ]}
                    value={attendanceStatus}
                    onChange={(v: string) => setAttendanceStatus(v as any)}
                    className="w-36"
                  />
                  <Button onClick={handleMarkSelected} loading={markMutation.isPending}>
                    <Icon name="check" size={16} className="mr-1.5" />
                    Mark Selected
                  </Button>
                  <Button variant="outline" onClick={() => handleMarkAll('present')}>Mark All Present</Button>
                  <Button variant="destructive" onClick={() => handleMarkAll('absent')}>Mark All Absent</Button>
                </div>

                <Card className="border-border/60">
                  <CardContent className="p-0">
                    {classStudents.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                        <Icon name="search_off" size={48} className="opacity-50" />
                        <p className="text-title-sm font-semibold">No students found</p>
                      </div>
                    ) : (
                      <div className="border border-border/60 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3 w-10">
                                <input
                                  type="checkbox"
                                  className="rounded border-border"
                                  checked={selectedStudentIds.length === classStudents.length && classStudents.length > 0}
                                  onChange={() => {
                                    if (selectedStudentIds.length === classStudents.length) {
                                      setSelectedStudentIds([]);
                                    } else {
                                      setSelectedStudentIds(classStudents.map((s) => s.id).filter(Boolean) as string[]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="px-4 py-3">Student Name</th>
                              <th className="px-4 py-3">Student ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-title-sm">
                            {classStudents.map((s) => (
                              <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${selectedStudentIds.includes(s.id) ? 'bg-primary/5' : ''}`}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    className="rounded border-border"
                                    checked={selectedStudentIds.includes(s.id)}
                                    onChange={() => toggleStudent(s.id)}
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold">{s.displayName || s.email}</td>
                                <td className="px-4 py-3 text-muted-foreground font-mono">{s.studentId || s.id.slice(0, 8)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            {!selectedClass ? (
              <Card className="border-border/60">
                <CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                  <Icon name="assessment" size={48} className="opacity-50" />
                  <p className="text-title-sm font-semibold">Select a class to view reports</p>
                </CardContent>
              </Card>
            ) : (
              <DataFetchWrapper
                data={reportData}
                isLoading={reportLoading}
                error={reportError ? new Error('Failed to load report') : null}
                onRetry={refetchReport}
                loadingType="card"
              >
                {() => (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={async () => {
                        try {
                          const blob = await attendanceService.exportAttendanceCSV(selectedClass).then((r: any) => r);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `attendance-${selectedClass}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { toast.error('Failed to export'); }
                      }}>
                        <Icon name="download" size={16} className="mr-1.5" />
                        Export CSV
                      </Button>
                    </div>

                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Attendance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(!reportData?.summary || Object.keys(reportData.summary).length === 0) ? (
                          <p className="text-muted-foreground text-center py-8">No attendance records found</p>
                        ) : (
                          <div className="border border-border/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  <th className="px-4 py-3">Student</th>
                                  <th className="px-4 py-3 text-center">Present</th>
                                  <th className="px-4 py-3 text-center">Absent</th>
                                  <th className="px-4 py-3 text-center">Late</th>
                                  <th className="px-4 py-3 text-center">Holiday</th>
                                  <th className="px-4 py-3 text-center">Total</th>
                                  <th className="px-4 py-3 text-center">%</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 text-title-sm">
                                {Object.entries(reportData.summary).map(([studentId, data]: [string, any]) => {
                                  const student = usersData.find((u) => u.id === studentId);
                                  const pct = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
                                  return (
                                    <tr key={studentId} className="hover:bg-muted/20">
                                      <td className="px-4 py-3 font-semibold">{student?.displayName || studentId}</td>
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
                  </div>
                )}
              </DataFetchWrapper>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
