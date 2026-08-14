import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AcademicYearSelect } from '@/components/ui/academic-year-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { feeService } from '@/services/feeService';
import { getAllUsers } from '@/services/dataService';
import { useClasses } from '@/hooks/useClasses';
import ClassSelect from '@/components/common/ClassSelect';

function OutstandingRow({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3 font-semibold flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{expanded ? '▼' : '▶'}</span>
          {item.studentName || item.studentId}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{item.className || '-'}</td>
        <td className="px-4 py-3 text-right font-mono">Rs. {item.totalDue?.toFixed(2)}</td>
        <td className="px-4 py-3 text-right font-mono text-success">Rs. {item.totalPaid?.toFixed(2)}</td>
        <td className={`px-4 py-3 text-right font-mono font-bold ${item.balance > 0 ? 'text-error' : 'text-success'}`}>
          Rs. {item.balance?.toFixed(2)}
        </td>
      </tr>
      {expanded && item.schedules?.map((sc: any) => (
        <tr key={`${item.studentId}-${sc.scheduleId}`} className="bg-muted/10 text-sm">
          <td className="px-4 py-2 pl-10 text-muted-foreground">{sc.name}</td>
          <td className="px-4 py-2 text-muted-foreground">{sc.due_date || sc.dueDate ? new Date(sc.due_date || sc.dueDate).toLocaleDateString() : '-'}</td>
          <td className="px-4 py-2 text-right font-mono">Rs. {sc.amount?.toFixed(2)}</td>
          <td className="px-4 py-2 text-right font-mono text-success">Rs. {(sc.paid || 0)?.toFixed(2)}</td>
          <td className={`px-4 py-2 text-right font-mono font-bold ${(sc.amount - (sc.paid || 0)) > 0 ? 'text-error' : 'text-success'}`}>
            Rs. {(sc.amount - (sc.paid || 0))?.toFixed(2)}
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminFeePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('schedules');
  const [newSchedule, setNewSchedule] = useState({ name: '', amount: 0, dueDate: '', classId: '', academicYear: '', description: '' });
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({ studentId: '', feeScheduleId: '', amountPaid: 0, paymentMethod: 'cash', transactionId: '' });
  const [paymentStudentLookup, setPaymentStudentLookup] = useState('');
  const { data: classesData = [] } = useClasses();
  const { data: usersData = [] } = useQuery({ queryKey: ['admin-users'], queryFn: getAllUsers });
  const students = useMemo(() => usersData.filter((u) => u.role === 'student'), [usersData]);
  const filteredStudents = useMemo(() => {
    if (!paymentStudentLookup) return students;
    const q = paymentStudentLookup.toLowerCase();
    return students.filter((s) => s.displayName?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, paymentStudentLookup]);

  const { data: allSchedulesData, isLoading: schedLoading, isError: schedError, refetch: refetchSched } = useQuery({
    queryKey: ['fee-schedules'],
    queryFn: () => feeService.listFeeSchedules().then((r) => r.data),
  });

  const selectedStudent = useMemo(() => {
    if (!paymentData.studentId) return null;
    return students.find((s) => s.id === paymentData.studentId) || null;
  }, [students, paymentData.studentId]);

  const schedulesData = useMemo(() => {
    const all = allSchedulesData || [];
    if (!selectedStudent) return all;
    const studentClassId = selectedStudent.classId || (selectedStudent.classIds?.[0]);
    if (!studentClassId) return all;
    const filtered = all.filter((s) => (s as any).class_id === studentClassId || s.classId === studentClassId);
    return filtered;
  }, [allSchedulesData, selectedStudent]);

  const { data: outstandingData, isLoading: outLoading, isError: outError, refetch: refetchOut } = useQuery({
    queryKey: ['fee-outstanding'],
    queryFn: () => feeService.getOutstandingReport().then((r) => r.data),
    enabled: activeTab === 'outstanding',
  });

  const { data: studentPayments, isLoading: payLoading, isError: payError, refetch: refetchPay } = useQuery({
    queryKey: ['student-payments', paymentData.studentId],
    queryFn: () => feeService.getStudentPayments(paymentData.studentId).then((r) => r.data),
    enabled: !!paymentData.studentId && activeTab === 'payments',
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: typeof newSchedule) => feeService.createFeeSchedule(data),
    onSuccess: () => { toast.success('Fee schedule created'); setNewSchedule({ name: '', amount: 0, dueDate: '', classId: '', academicYear: '', description: '' }); queryClient.invalidateQueries({ queryKey: ['fee-schedules'] }); refetchOut(); },
    onError: (err: any) => toast.error(err.message || 'Failed to create schedule'),
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof newSchedule }) => feeService.updateFeeSchedule(id, data),
    onSuccess: () => { toast.success('Fee schedule updated'); resetScheduleForm(); queryClient.invalidateQueries({ queryKey: ['fee-schedules'] }); refetchOut(); },
    onError: (err: any) => toast.error(err.message || 'Failed to update schedule'),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => feeService.deleteFeeSchedule(id),
    onSuccess: () => { toast.success('Fee schedule deleted'); setDeleteConfirm(null); queryClient.invalidateQueries({ queryKey: ['fee-schedules'] }); refetchOut(); },
    onError: (err: any) => toast.error(err.message || 'Failed to delete schedule'),
  });

  function resetScheduleForm() {
    setNewSchedule({ name: '', amount: 0, dueDate: '', classId: '', academicYear: '', description: '' });
    setEditingSchedule(null);
  }

  function openEdit(s: any) {
    setEditingSchedule(s);
    setNewSchedule({
      name: s.name || '',
      amount: Number(s.amount) || 0,
      dueDate: s.due_date || s.dueDate || '',
      classId: s.class_id || s.classId || '',
      academicYear: s.academic_year || s.academicYear || '',
      description: s.description || '',
    });
  }

  function handleScheduleSave() {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: newSchedule });
    } else {
      createScheduleMutation.mutate(newSchedule);
    }
  }

  const recordPaymentMutation = useMutation({
    mutationFn: (data: typeof paymentData) => feeService.recordPayment(data),
    onSuccess: () => { toast.success('Payment recorded'); setPaymentData({ studentId: '', feeScheduleId: '', amountPaid: 0, paymentMethod: 'cash', transactionId: '' }); queryClient.invalidateQueries({ queryKey: ['student-payments'] }); refetchOut(); },
    onError: (err: any) => toast.error(err.message || 'Failed to record payment'),
  });

  return (
    <>
      <SEOHead title="Fee Management" description="Fee schedules, payments, and outstanding reports" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Fee & ERP Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Manage fee schedules, payments, and outstanding reports</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="schedules">Fee Schedules</TabsTrigger>
            <TabsTrigger value="payments">Record Payment</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding Report</TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">{editingSchedule ? 'Edit Fee Schedule' : 'Create Fee Schedule'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input placeholder="Fee Name (e.g. Tuition Fee)" value={newSchedule.name} onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })} />
                  <Input type="number" placeholder="Amount" value={newSchedule.amount || ''} onChange={(e) => setNewSchedule({ ...newSchedule, amount: Number(e.target.value) })} />
                  <Input type="date" placeholder="Due Date" value={newSchedule.dueDate} onChange={(e) => setNewSchedule({ ...newSchedule, dueDate: e.target.value })} />
                  <ClassSelect
                    value={newSchedule.classId}
                    onChange={(v) => setNewSchedule({ ...newSchedule, classId: v })}
                    className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <AcademicYearSelect
                    value={newSchedule.academicYear}
                    onChange={(v) => setNewSchedule({ ...newSchedule, academicYear: v })}
                    placeholder="Academic Year"
                    globalSwitcher
                  />
                  <Input placeholder="Description (optional)" value={newSchedule.description} onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleScheduleSave} loading={createScheduleMutation.isPending || updateScheduleMutation.isPending} disabled={!newSchedule.name || !newSchedule.amount || !newSchedule.dueDate || !newSchedule.classId || !newSchedule.academicYear}>
                    <Icon name={editingSchedule ? 'save' : 'add'} size={16} className="mr-1.5" />
                    {editingSchedule ? 'Save Changes' : 'Create Fee Schedule'}
                  </Button>
                  {editingSchedule && (
                    <Button variant="outline" onClick={resetScheduleForm}>Cancel</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <DataFetchWrapper
              data={allSchedulesData}
              isLoading={schedLoading}
              error={schedError ? new Error('Failed to load') : null}
              onRetry={refetchSched}
              loadingType="card"
            >
              {() => (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-sm">Existing Fee Schedules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(allSchedulesData as any[])?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No fee schedules created yet</p>
                    ) : (
                      <div className="border border-border/60 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Due Date</th>
                              <th className="px-4 py-3">Class</th>
                              <th className="px-4 py-3">Academic Year</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-title-sm">
                            {(allSchedulesData as any[])?.map((s: any) => {
                              const cls = classesData.find((c) => c.id === (s.class_id || s.classId));
                              return (
                                <tr key={s.id} className="hover:bg-muted/20">
                                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                                  <td className="px-4 py-3 font-mono font-bold">Rs. {s.amount?.toFixed(2)}</td>
                                  <td className="px-4 py-3">{s.due_date ? new Date(s.due_date).toLocaleDateString() : '-'}</td>
                                  <td className="px-4 py-3">{cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : s.class_id || s.classId || '-'}</td>
                                  <td className="px-4 py-3">{s.academic_year || s.academicYear || '-'}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} title="Edit"><Icon name="edit" size={16} /></Button>
                                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteConfirm(s)} title="Delete"><Icon name="delete" size={16} /></Button>
                                    </div>
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
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">Record Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search student by name or ID..."
                    value={paymentStudentLookup}
                    onChange={(e) => setPaymentStudentLookup(e.target.value)}
                  />
                  {paymentStudentLookup && (
                    <div className="border border-border/60 rounded-xl max-h-48 overflow-y-auto">
                      {filteredStudents.slice(0, 10).map((s) => (
                        <button
                          key={s.id}
                          className={`w-full text-left px-4 py-2 hover:bg-muted/30 transition-colors text-title-sm ${paymentData.studentId === s.id ? 'bg-primary/10 font-semibold' : ''}`}
                          onClick={() => { setPaymentData({ ...paymentData, studentId: s.id }); setPaymentStudentLookup(s.displayName || s.email); }}
                        >
                          {s.displayName || s.email} {s.studentId ? `- ${s.studentId}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <select className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary" value={paymentData.feeScheduleId} onChange={(e) => setPaymentData({ ...paymentData, feeScheduleId: e.target.value })}>
                      <option value="">Select Fee Schedule</option>
                      {!paymentData.studentId ? (
                        <option value="" disabled>Select a student first</option>
                      ) : !schedulesData || schedulesData.length === 0 ? (
                        <option value="" disabled>No fee schedules available for this student.</option>
                      ) : (
                        (schedulesData as any[])?.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} - Rs. {s.amount?.toFixed(2)}</option>
                        ))
                      )}
                    </select>
                    <Input type="number" placeholder="Amount Paid" value={paymentData.amountPaid || ''} onChange={(e) => setPaymentData({ ...paymentData, amountPaid: Number(e.target.value) })} />
                    <select className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary" value={paymentData.paymentMethod} onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online Payment</option>
                    </select>
                    <Input placeholder="Transaction ID (optional)" value={paymentData.transactionId} onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })} />
                  </div>
                  <Button onClick={() => recordPaymentMutation.mutate(paymentData)} loading={recordPaymentMutation.isPending} disabled={!paymentData.studentId || !paymentData.feeScheduleId || !paymentData.amountPaid}>
                    <Icon name="payments" size={16} className="mr-1.5" />
                    Record Payment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {paymentData.studentId && (
              <DataFetchWrapper
                data={studentPayments}
                isLoading={payLoading}
                error={payError ? new Error('Failed to load') : null}
                onRetry={refetchPay}
                loadingType="card"
              >
                {() => {
                  const student = usersData.find((u) => u.id === paymentData.studentId);
                  return (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Payment History for {student?.displayName || paymentData.studentId}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(studentPayments as any[])?.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No payments recorded</p>
                        ) : (
                          <div className="border border-border/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  <th className="px-4 py-3">Schedule</th>
                                  <th className="px-4 py-3">Amount Paid</th>
                                  <th className="px-4 py-3">Method</th>
                                  <th className="px-4 py-3">Date</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 text-title-sm">
                                {(studentPayments as any[])?.map((p: any) => {
                                  const sched = (schedulesData as any[])?.find((s: any) => s.id === (p.fee_structure_id || p.feeScheduleId));
                                  return (
                                    <tr key={p.id} className="hover:bg-muted/20">
                                      <td className="px-4 py-3 font-semibold">{sched?.name || '—'}</td>
                                      <td className="px-4 py-3 font-mono font-bold">Rs. {(p.amount || p.amountPaid)?.toFixed(2)}</td>
                                      <td className="px-4 py-3 capitalize">{p.payment_method || p.paymentMethod || '-'}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at || p.paymentDate).toLocaleDateString()}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                          p.status === 'completed' ? 'bg-success-container text-success' :
                                          p.status === 'pending' ? 'bg-warning-container text-warning' :
                                          p.status === 'failed' ? 'bg-error-container text-error' :
                                          p.status === 'refunded' ? 'bg-muted text-muted-foreground' :
                                          'bg-muted text-muted-foreground'
                                        }`}>{p.status || 'completed'}</span>
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
                  );
                }}
              </DataFetchWrapper>
            )}
          </TabsContent>

          <TabsContent value="outstanding" className="space-y-6">
            <DataFetchWrapper
              data={outstandingData}
              isLoading={outLoading}
              error={outError ? new Error('Failed to load') : null}
              onRetry={refetchOut}
              loadingType="card"
            >
              {() => (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-title-sm">Outstanding Fee Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(outstandingData as any[])?.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No outstanding fees</p>
                    ) : (
                        <div className="border border-border/60 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3">Student</th>
                              <th className="px-4 py-3">Class</th>
                              <th className="px-4 py-3 text-right">Total Due</th>
                              <th className="px-4 py-3 text-right">Total Paid</th>
                              <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-title-sm">
                            {(outstandingData as any[])?.map((item: any) => (
                              <OutstandingRow key={item.studentId} item={item} />
                            ))}
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
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}
        title="Delete Fee Schedule"
        description={deleteConfirm ? `Are you sure you want to delete the fee schedule "${deleteConfirm.name}"? This cannot be undone.` : ''}
        confirmText="Delete"
        destructive
        loading={deleteScheduleMutation.isPending}
        onConfirm={() => { if (deleteConfirm) deleteScheduleMutation.mutate(deleteConfirm.id); }}
      />
    </>
  );
}
