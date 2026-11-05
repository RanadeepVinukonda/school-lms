import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { hrService, StaffRecord, PayrollRun } from '@/services/hrService';

export default function AdminPayrollPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('runs');

  // Month state (YYYY-MM format)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Configuration States
  const [configuringStaff, setConfiguringStaff] = useState<StaffRecord | null>(null);
  const [configForm, setConfigForm] = useState({ base_salary: 0, allowances: 0, deductions: 0 });

  // Queries
  const { data: staffRes, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-staff-payroll-list'],
    queryFn: () => hrService.getStaff(),
  });

  const { data: payrollRes, isLoading: payrollLoading, refetch: refetchPayroll } = useQuery({
    queryKey: ['admin-payroll-runs', selectedMonth],
    queryFn: () => hrService.getPayrollRuns(selectedMonth),
    enabled: activeTab === 'runs' && !!selectedMonth,
  });

  const staffList = staffRes?.data || [];
  const payrollList = payrollRes?.data || [];

  // Mutations
  const configureSalaryMutation = useMutation({
    mutationFn: (data: { staff_id: string; base_salary: number; allowances: number; deductions: number }) =>
      hrService.configureSalary(data),
    onSuccess: () => {
      toast.success('Salary configuration updated');
      setConfiguringStaff(null);
      queryClient.invalidateQueries({ queryKey: ['admin-staff-payroll-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payroll-runs'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to configure salary'),
  });

  const runPayrollMutation = useMutation({
    mutationFn: (data: { staff_id: string; month: string }) => hrService.runPayroll(data),
    onSuccess: () => {
      toast.success('Payroll generated and payslip processed');
      queryClient.invalidateQueries({ queryKey: ['admin-payroll-runs'] });
      refetchPayroll();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to process payroll'),
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringStaff) return;
    configureSalaryMutation.mutate({
      staff_id: configuringStaff.id,
      ...configForm,
    });
  };

  const startConfiguration = async (staff: StaffRecord) => {
    setConfiguringStaff(staff);
    try {
      const res = await hrService.getSalaryConfig(staff.id);
      if (res?.data) {
        setConfigForm({
          base_salary: Number(res.data.base_salary),
          allowances: Number(res.data.allowances),
          deductions: Number(res.data.deductions),
        });
      } else {
        setConfigForm({ base_salary: 0, allowances: 0, deductions: 0 });
      }
    } catch {
      setConfigForm({ base_salary: 0, allowances: 0, deductions: 0 });
    }
  };

  return (
    <>
      <SEOHead title="Payroll Management" description="Run salary payroll and generate payslips" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Payroll & Payslips</h1>
          <p className="text-body-md text-muted-foreground mt-1 font-normal">Configure salary details, run payroll monthly, and download staff payslips</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
            <TabsTrigger value="configurations">Salary Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-6 outline-none">
            <div className="flex gap-4 items-center max-w-xs">
              <label className="text-label-sm text-muted-foreground block shrink-0">Select Month</label>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm">Process Staff Payroll</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Staff Member</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3 text-right">Net Salary</th>
                        <th className="px-6 py-3 text-right">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {staffList.map((staff: StaffRecord) => {
                        const payroll = payrollList.find((p: PayrollRun) => p.staff_id === staff.id);
                        return (
                          <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 font-semibold">{staff.name}</td>
                            <td className="px-6 py-4 capitalize">{staff.role}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold">
                              {payroll ? `₹${Number(payroll.net_salary).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {payroll ? (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={hrService.getPayslipDownloadUrl(payroll.id)} download>
                                    <Icon name="download" size={14} className="mr-1" />
                                    Download Payslip
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => runPayrollMutation.mutate({ staff_id: staff.id, month: selectedMonth })}
                                >
                                  Process Salary
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configurations" className="space-y-6 outline-none">
            {configuringStaff && (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-title-sm">Salary Configuration: {configuringStaff.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleConfigSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Base Salary (Monthly) *</label>
                        <Input
                          type="number"
                          value={configForm.base_salary}
                          onChange={(e) => setConfigForm({ ...configForm, base_salary: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Allowances</label>
                        <Input
                          type="number"
                          value={configForm.allowances}
                          onChange={(e) => setConfigForm({ ...configForm, allowances: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-foreground mb-1 block">Deductions</label>
                        <Input
                          type="number"
                          value={configForm.deductions}
                          onChange={(e) => setConfigForm({ ...configForm, deductions: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setConfiguringStaff(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" loading={configureSalaryMutation.isPending}>
                        Save Configuration
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3">Staff Member</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-title-sm">
                  {staffList.map((staff: StaffRecord) => (
                    <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-semibold">{staff.name}</td>
                      <td className="px-6 py-4 capitalize">{staff.role}</td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => startConfiguration(staff)}>
                          <Icon name="settings" size={14} className="mr-1" />
                          Configure Salary
                        </Button>
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
