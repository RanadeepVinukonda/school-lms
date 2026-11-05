import { useState } from 'react';
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
import { hrService, StaffRecord } from '@/services/hrService';
import { getAllUsers } from '@/services/dataService';

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('directory');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'teacher' as 'teacher' | 'non-teaching', department: '', joining_date: '', user_id: '' });
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);

  // Attendance states
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Queries
  const { data: staffRes, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => hrService.getStaff(),
  });

  const { data: usersRes = [] } = useQuery({
    queryKey: ['admin-unassigned-users'],
    queryFn: getAllUsers,
  });

  const staffList = staffRes?.data || [];
  const teacherUsers = usersRes.filter((u) => u.role === 'teacher');

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => hrService.createStaff(data),
    onSuccess: () => {
      toast.success('Staff record created');
      setForm({ name: '', role: 'teacher', department: '', joining_date: '', user_id: '' });
      setShowAddForm(false);
      refetchStaff();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create staff'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrService.deleteStaff(id),
    onSuccess: () => {
      toast.success('Staff record deleted');
      refetchStaff();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete staff'),
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data: { staff_id: string; date: string; status: 'present' | 'absent' | 'leave' }) =>
      hrService.markAttendance(data),
    onSuccess: () => {
      toast.success('Attendance recorded');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to record attendance'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate(form);
  };

  return (
    <>
      <SEOHead title="Staff Directory" description="Manage school staff and mark daily attendance" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Staff Management</h1>
            <p className="text-body-md text-muted-foreground mt-1 font-normal">Manage teachers and non-teaching staff, track attendance, and logs</p>
          </motion.div>
          {activeTab === 'directory' && !showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="self-start">
              <Icon name="add" size={16} className="mr-1.5" />
              Add Staff Record
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="directory">Staff Directory</TabsTrigger>
            <TabsTrigger value="attendance">Daily Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-6 outline-none">
            {showAddForm && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Add New Staff Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Full Name *</label>
                        <Input
                          placeholder="e.g. John Doe"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Role *</label>
                        <OptionsSelect
                          options={[
                            { value: 'teacher', label: 'Teacher' },
                            { value: 'non-teaching', label: 'Non-Teaching' },
                          ]}
                          value={form.role}
                          onValueChange={(v: any) => setForm({ ...form, role: v })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Department</label>
                        <Input
                          placeholder="e.g. Science, Admin"
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Joining Date</label>
                        <Input
                          type="date"
                          value={form.joining_date}
                          onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Link User Account</label>
                        <OptionsSelect
                          options={teacherUsers.map((u) => ({ value: u.id, label: u.displayName || u.email }))}
                          value={form.user_id}
                          onValueChange={(v: string) => setForm({ ...form, user_id: v })}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={createMutation.isPending}>
                        Save Record
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <DataFetchWrapper data={staffList} isLoading={staffLoading} onRetry={refetchStaff} loadingType="table">
              {() => (
                <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Staff Name</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Department</th>
                        <th className="px-6 py-3">Joining Date</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {staffList.map((staff: StaffRecord) => (
                        <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold">{staff.name}</td>
                          <td className="px-6 py-4 capitalize">{staff.role}</td>
                          <td className="px-6 py-4 text-muted-foreground">{staff.department || '-'}</td>
                          <td className="px-6 py-4 text-muted-foreground">{staff.joining_date || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-error hover:text-error hover:bg-error-container/20"
                              onClick={() => {
                                if (confirm(`Delete staff record for "${staff.name}"?`)) {
                                  deleteMutation.mutate(staff.id);
                                }
                              }}
                            >
                              <Icon name="delete" size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6 outline-none">
            <div className="flex gap-4 items-center max-w-xs">
              <label className="text-label-sm text-muted-foreground block shrink-0">Select Date</label>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>

            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3">Staff Name</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-title-sm">
                  {staffList.map((staff: StaffRecord) => (
                    <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-semibold">{staff.name}</td>
                      <td className="px-6 py-4 capitalize">{staff.role}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {(['present', 'absent', 'leave'] as const).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                markAttendanceMutation.mutate({ staff_id: staff.id, date: attendanceDate, status })
                              }
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
