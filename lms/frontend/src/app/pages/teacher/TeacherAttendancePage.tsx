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
import { OptionsSelect } from '@/components/ui/select';
import { attendanceService } from '@/services/attendanceService';
import { getStudentsByClass } from '@/services/dataService';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/supabase/config';

export default function TeacherAttendancePage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || '';
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late' | 'holiday'>('present');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: teacherClasses = [] } = useQuery({
    queryKey: ['teacher-classes', userId],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').contains('teacherIds', [userId]);
      return (data || []).map((d: any) => ({ id: d.id, ...d }));
    },
    enabled: !!userId,
  });

  const { data: classStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['teacher-class-students', selectedClass],
    queryFn: () => getStudentsByClass(selectedClass),
    enabled: !!selectedClass,
  });

  const markMutation = useMutation({
    mutationFn: (data: { studentIds: string[]; classId: string; date: string; status: 'present' | 'absent' | 'late' | 'holiday'; markedBy: string }) =>
      attendanceService.markAttendance(data),
    onSuccess: () => {
      toast.success(_('Attendance marked'));
      setSelectedStudentIds([]);
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
    if (selectedStudentIds.length === 0) {
      toast.error(_('Select students'));
      return;
    }
    markMutation.mutate({ studentIds: selectedStudentIds, classId: selectedClass, date: selectedDate, status: attendanceStatus, markedBy: userId });
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'late' | 'holiday') => {
    if (!selectedClass || !selectedDate) return;
    const ids = classStudents.map((s: any) => s.id).filter(Boolean);
    if (ids.length === 0) return;
    markMutation.mutate({ studentIds: ids, classId: selectedClass, date: selectedDate, status, markedBy: userId });
  };

  return (
    <>
      <SEOHead title={_('Mark Attendance')} description={_('Mark your class attendance')} />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md font-bold tracking-tight">{_('Mark Attendance')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">{_('Record daily attendance for your classes')}</p>
        </motion.div>

        <div className="flex gap-3 items-center flex-wrap">
          <select
            className="h-10 flex-1 min-w-[200px] px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">{_('Select your class...')}</option>
            {teacherClasses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
        </div>

        {selectedClass && (
          <>
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
                          <th className="px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={selectedStudentIds.length === classStudents.length}
                              onChange={() => {
                                if (selectedStudentIds.length === classStudents.length) {
                                  setSelectedStudentIds([]);
                                } else {
                                  setSelectedStudentIds(classStudents.map((s: any) => s.id).filter(Boolean));
                                }
                              }}
                            />
                          </th>
                          <th className="px-4 py-3">{_('Student Name')}</th>
                          <th className="px-4 py-3">{_('Roll No')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-title-sm">
                        {classStudents.map((s: any) => (
                          <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${selectedStudentIds.includes(s.id) ? 'bg-primary/5' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" className="rounded border-border" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                            </td>
                            <td className="px-4 py-3 font-semibold">{s.displayName || s.email}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">{s.rollNo || '-'}</td>
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
