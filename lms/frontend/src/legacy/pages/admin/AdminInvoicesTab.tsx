import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { feeService, type InvoiceComputed, type InvoicePreviewData } from '@/services/feeService';

interface InvoicesTabProps {
  students: Array<Record<string, any>>;
}

const money = (n: number) => `Rs. ${(Number(n) || 0).toFixed(2)}`;

function statusBadge(status: string) {
  if (status === 'Paid') return <Badge variant="success">{status}</Badge>;
  if (status === 'Partially Paid') return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

export default function AdminInvoicesTab({ students }: InvoicesTabProps) {
  const queryClient = useQueryClient();
  const [studentLookup, setStudentLookup] = useState('');
  const [form, setForm] = useState<{
    studentId: string;
    feeScheduleId: string;
    discount: number;
    paymentMethod: string;
    transactionId: string;
  }>({ studentId: '', feeScheduleId: '', discount: 0, paymentMethod: '', transactionId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<InvoiceComputed | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceComputed | null>(null);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.studentId) || null,
    [students, form.studentId],
  );

  const { data: previewData, isLoading: previewLoading, isError: previewError, refetch: refetchPreview } = useQuery<
    InvoicePreviewData | undefined
  >({
    queryKey: ['invoice-preview', form.studentId],
    queryFn: () => feeService.getInvoicePreviewData(form.studentId).then((r) => r.data),
    enabled: !!form.studentId,
  });

  const { data: invoicesData, isLoading: invLoading, isError: invError, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => feeService.listInvoices().then((r) => r.data),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () =>
      feeService.createInvoice({
        studentId: form.studentId,
        feeStructureId: form.feeScheduleId,
        discount: form.discount,
        paymentMethod: form.paymentMethod || undefined,
        transactionId: form.transactionId || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Invoice generated successfully');
      setCreatedInvoice(res.data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      refetchInvoices();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create invoice'),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => feeService.deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      refetchInvoices();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete invoice'),
  });

  const filteredStudents = useMemo(() => {
    if (!studentLookup) return students;
    const q = studentLookup.toLowerCase();
    return students.filter(
      (s) =>
        s.displayName?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q),
    );
  }, [students, studentLookup]);

  const computedTotal = useMemo(() => {
    const schedule = previewData?.schedules?.find((s) => s.scheduleId === form.feeScheduleId);
    const feeAmount = schedule?.amount || 0;
    const selectedBalance = schedule?.balance || 0;
    const previousDue = Math.max(0, (previewData?.totalOutstanding || 0) - selectedBalance);
    const discount = Number(form.discount) || 0;
    const total = Math.max(0, feeAmount + previousDue - discount);
    const balance = Math.max(0, total - (schedule?.paid || 0));
    return { feeAmount, previousDue, discount, total, balance };
  }, [previewData, form.feeScheduleId, form.discount]);

  const openPdf = useCallback((id: string, inline: boolean) => {
    window.open(feeService.invoicePdfUrl(id, inline), '_blank');
  }, []);

  const selectStudent = useCallback((s: Record<string, any>) => {
    setForm({ studentId: s.id, feeScheduleId: '', discount: 0, paymentMethod: '', transactionId: '' });
    setStudentLookup(s.displayName || s.email || '');
    setCreatedInvoice(null);
  }, []);

  const resetForm = useCallback(() => {
    setForm({ studentId: '', feeScheduleId: '', discount: 0, paymentMethod: '', transactionId: '' });
    setStudentLookup('');
    setCreatedInvoice(null);
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-title-sm">Generate Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search student by name or ID..."
              value={studentLookup}
              onChange={(e) => setStudentLookup(e.target.value)}
            />
            {studentLookup && (
              <div className="border border-border/60 rounded-xl max-h-48 overflow-y-auto">
                {filteredStudents.slice(0, 10).map((s) => (
                  <button
                    key={s.id}
                    className={`w-full text-left px-4 py-2 hover:bg-muted/30 transition-colors text-title-sm ${
                      form.studentId === s.id ? 'bg-primary/10 font-semibold' : ''
                    }`}
                    onClick={() => selectStudent(s)}
                  >
                    {s.displayName || s.email} {s.studentId ? `- ${s.studentId}` : ''}
                  </button>
                ))}
              </div>
            )}

            {form.studentId && (
              <DataFetchWrapper
                data={previewData}
                isLoading={previewLoading}
                error={previewError ? new Error('Failed to load') : null}
                onRetry={refetchPreview}
                loadingType="card"
              >
                {() => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-xl border border-border/60 p-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Student</Label>
                        <p className="font-semibold">{previewData?.student?.display_name || selectedStudent?.displayName || '-'}</p>
                        {selectedStudent?.email && <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>}
                        {selectedStudent?.phone && <p className="text-sm text-muted-foreground">{selectedStudent.phone}</p>}
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Class</Label>
                        <p className="font-semibold">{previewData?.className || 'Class ' + (selectedStudent?.classId || '') || '-'}</p>
                        {selectedStudent?.rollNo && <p className="text-sm text-muted-foreground">Roll No: {selectedStudent.rollNo}</p>}
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Parent / Guardian</Label>
                        <p className="font-semibold">{previewData?.parent?.display_name || '-'}</p>
                        {previewData?.parent?.email && <p className="text-sm text-muted-foreground">{previewData.parent.email}</p>}
                        {previewData?.parent?.phone_number && <p className="text-sm text-muted-foreground">{previewData.parent.phone_number}</p>}
                      </div>
                      {previewData?.totalOutstanding != null && previewData.totalOutstanding > 0 && (
                        <div>
                          <Label className="text-muted-foreground text-xs">Total Outstanding (all schedules)</Label>
                          <p className="font-semibold text-error">{money(previewData.totalOutstanding)}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-1.5">
                        <Label>Fee / Schedule</Label>
                        <select
                          className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                          value={form.feeScheduleId}
                          onChange={(e) => setForm({ ...form, feeScheduleId: e.target.value })}
                        >
                          <option value="">Select Fee Schedule</option>
                          {!previewData?.schedules?.length ? (
                            <option value="" disabled>No fee schedules available for this student</option>
                          ) : (
                            previewData.schedules.map((s) => (
                              <option key={s.scheduleId} value={s.scheduleId}>
                                {s.name} - {money(s.amount)}{s.paid > 0 ? ` (paid ${money(s.paid)})` : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Discount ({money(computedTotal.discount)})</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Discount amount"
                          value={form.discount || ''}
                          onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Payment Method (optional)</Label>
                        <select
                          className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full"
                          value={form.paymentMethod}
                          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                        >
                          <option value="">—</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="online">Online Payment</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Transaction / Reference No (optional)</Label>
                        <Input
                          placeholder="Transaction ID"
                          value={form.transactionId}
                          onChange={(e) => setForm({ ...form, transactionId: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </DataFetchWrapper>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => createInvoiceMutation.mutate()}
                loading={createInvoiceMutation.isPending}
                disabled={!form.studentId || !form.feeScheduleId}
              >
                <Icon name="add" size={16} className="mr-1.5" />
                Save &amp; Generate Invoice
              </Button>
              {createdInvoice && (
                <>
                  <Button variant="outline" onClick={() => openPdf(createdInvoice.invoice.id, true)}>
                    <Icon name="print" size={16} className="mr-1.5" /> Print
                  </Button>
                  <Button variant="outline" onClick={() => openPdf(createdInvoice.invoice.id, false)}>
                    <Icon name="download" size={16} className="mr-1.5" /> Download PDF
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>New Invoice</Button>
                </>
              )}
            </div>

            {form.feeScheduleId && form.studentId && !previewLoading && (
              <div className="rounded-xl border border-border/60 overflow-hidden mt-4">
                <table className="w-full text-left text-title-sm">
                  <tbody className="divide-y divide-border/40">
                    <tr><td className="px-4 py-2 text-muted-foreground">Fee Amount</td><td className="px-4 py-2 text-right font-mono">{money(computedTotal.feeAmount)}</td></tr>
                    {computedTotal.previousDue > 0 && (
                      <tr><td className="px-4 py-2 text-muted-foreground">Previous Dues</td><td className="px-4 py-2 text-right font-mono">{money(computedTotal.previousDue)}</td></tr>
                    )}
                    {computedTotal.discount > 0 && (
                      <tr><td className="px-4 py-2 text-muted-foreground">Discount</td><td className="px-4 py-2 text-right font-mono text-error">- {money(computedTotal.discount)}</td></tr>
                    )}
                    <tr className="bg-muted/20 font-bold"><td className="px-4 py-2">Total</td><td className="px-4 py-2 text-right font-mono">{money(computedTotal.total)}</td></tr>
                    <tr><td className="px-4 py-2 text-muted-foreground">Amount Paid</td><td className="px-4 py-2 text-right font-mono text-success">{money(computedTotal.total - computedTotal.balance)}</td></tr>
                    <tr><td className="px-4 py-2 text-muted-foreground">Balance Due</td><td className={`px-4 py-2 text-right font-mono font-bold ${computedTotal.balance > 0 ? 'text-error' : 'text-success'}`}>{money(computedTotal.balance)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DataFetchWrapper
        data={invoicesData}
        isLoading={invLoading}
        error={invError ? new Error('Failed to load') : null}
        onRetry={refetchInvoices}
        loadingType="card"
      >
        {() => (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-title-sm">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {(invoicesData as InvoiceComputed[])?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices generated yet</p>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 py-3">Invoice No</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {(invoicesData as InvoiceComputed[])?.map((inv) => (
                        <tr key={inv.invoice.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold font-mono">{inv.invoice.invoice_number}</td>
                          <td className="px-4 py-3 font-semibold">{inv.student?.display_name || inv.invoice.student_id}</td>
                          <td className="px-4 py-3 text-muted-foreground">{inv.className || '-'}</td>
                          <td className="px-4 py-3 text-right font-mono">{money(inv.total)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${inv.balance > 0 ? 'text-error' : 'text-success'}`}>{money(inv.balance)}</td>
                          <td className="px-4 py-3">{statusBadge(inv.paymentStatus)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" title="Print" onClick={() => openPdf(inv.invoice.id, true)}>
                                <Icon name="print" size={16} />
                              </Button>
                              <Button variant="ghost" size="icon-sm" title="Download PDF" onClick={() => openPdf(inv.invoice.id, false)}>
                                <Icon name="download" size={16} />
                              </Button>
                              <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setDeleteConfirm(inv)}>
                                <Icon name="delete" size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </DataFetchWrapper>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}
        title="Delete Invoice"
        description={deleteConfirm ? `Are you sure you want to delete invoice "${deleteConfirm.invoice.invoice_number}"? This cannot be undone.` : ''}
        confirmText="Delete"
        destructive
        loading={deleteInvoiceMutation.isPending}
        onConfirm={() => { if (deleteConfirm) deleteInvoiceMutation.mutate(deleteConfirm.invoice.id); }}
      />
    </div>
  );
}
