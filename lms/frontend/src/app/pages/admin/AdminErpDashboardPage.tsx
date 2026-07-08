import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { feeService } from '@/services/feeService';
import { noticeService } from '@/services/noticeService';
import { attendanceService } from '@/services/attendanceService';
import { getAllClasses } from '@/services/dataService';
import { timetableService } from '@/services/timetableService';
import { staggerContainer, cardStackReveal } from '@/lib/motion';

const QUICK_LINKS = [
  { icon: 'payments', label: 'Fee Management', href: '/admin/fee', color: 'text-primary', bg: 'bg-primary-container' },
  { icon: 'calendar_month', label: 'Timetable', href: '/admin/timetable', color: 'text-success', bg: 'bg-success-container' },
  { icon: 'campaign', label: 'Notice Board', href: '/admin/noticeboard', color: 'text-warning', bg: 'bg-warning-container' },
  { icon: 'fact_check', label: 'Attendance', href: '/admin/attendance', color: 'text-error', bg: 'bg-error-container' },
  { icon: 'directions_bus', label: 'Transport', href: '/admin/transport', color: 'text-info', bg: 'bg-info-container' },
  { icon: 'inventory_2', label: 'Inventory', href: '/admin/inventory', color: 'text-secondary', bg: 'bg-secondary-container' },
  { icon: 'badge', label: 'HR / Staff', href: '/admin/hr', color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { icon: 'time_to_leave', label: 'Leave Requests', href: '/admin/hr/leaves', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: 'receipt_long', label: 'Payroll & Payslips', href: '/admin/hr/payroll', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: 'school', label: 'Google Classroom', href: '/admin/classroom', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: 'settings_input_component', label: 'Moodle LTI 1.3', href: '/admin/lti', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

export default function AdminErpDashboardPage() {
  const { data: classesData = [] } = useQuery({
    queryKey: ['erp-classes'],
    queryFn: getAllClasses,
  });

  const { data: outstandingRes, isLoading: feeLoading, isError: feeError, refetch: refetchFee } = useQuery({
    queryKey: ['erp-outstanding'],
    queryFn: () => feeService.getOutstandingReport().then((r) => r.data),
  });

  const { data: noticesRes, isLoading: noticeLoading, isError: noticeError, refetch: refetchNotices } = useQuery({
    queryKey: ['erp-notices'],
    queryFn: () => noticeService.getNotices(),
  });

  const { data: timetableRes, isLoading: ttLoading, isError: ttError, refetch: refetchTt } = useQuery({
    queryKey: ['erp-timetable'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        classesData.map((c) => timetableService.getByClass(c.id).then((r) => r.data)),
      );
      return results.reduce((acc: number, r) => {
        if (r.status === 'fulfilled' && r.value) return acc + r.value.length;
        return acc;
      }, 0);
    },
    enabled: classesData.length > 0,
  });

  const { data: attendanceData, isLoading: attLoading, isError: attError, refetch: refetchAtt } = useQuery({
    queryKey: ['erp-attendance'],
    queryFn: async () => {
      const results = await Promise.allSettled(
        classesData.slice(0, 5).map((c) => attendanceService.getAttendanceReport(c.id).then((r) => r.data)),
      );
      let total = 0;
      let present = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          for (const s of Object.values(r.value.summary || {})) {
            total += (s as any).total || 0;
            present += (s as any).present || 0;
          }
        }
      }
      return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    },
    enabled: classesData.length > 0,
  });

  const loading = feeLoading || noticeLoading || ttLoading || attLoading;
  const hasError = feeError || noticeError || ttError || attError;

  const outstandingList = (outstandingRes as any[]) ?? [];
  const noticesList = ((noticesRes as any)?.data as any[]) ?? [];

  const statCards = useMemo(() => [
    {
      icon: 'payments',
      label: 'Fee Collected This Month',
      value: `Rs. ${outstandingList.reduce((s: number, r: any) => s + (r.totalPaid || 0), 0).toLocaleString()}`,
      sub: `${outstandingList.filter((r: any) => r.balance > 0).length} pending`,
      color: 'text-primary',
      bg: 'bg-primary-container',
    },
    {
      icon: 'receipt_long',
      label: 'Pending Fees',
      value: outstandingList.filter((r: any) => r.balance > 0).length,
      sub: `${outstandingList.length} total students`,
      color: 'text-error',
      bg: 'bg-error-container',
    },
    {
      icon: 'campaign',
      label: 'Active Notices',
      value: noticesList.length,
      sub: noticesList.filter((n: any) => n.priority === 'high').length > 0
        ? `${noticesList.filter((n: any) => n.priority === 'high').length} high priority`
        : 'All clear',
      color: 'text-warning',
      bg: 'bg-warning-container',
    },
    {
      icon: 'calendar_month',
      label: 'Timetable Entries',
      value: timetableRes ?? 0,
      sub: `${classesData.length} classes`,
      color: 'text-success',
      bg: 'bg-success-container',
    },
    {
      icon: 'fact_check',
      label: 'Attendance Rate',
      value: attendanceData ? `${attendanceData.rate}%` : '--',
      sub: attendanceData ? `${attendanceData.present}/${attendanceData.total} present` : 'Loading...',
      color: 'text-info',
      bg: 'bg-info-container',
    },
    {
      icon: 'school',
      label: 'Total Classes',
      value: classesData.length,
      sub: `${outstandingList.length > 0 ? outstandingList.length : '--'} enrolled students`,
      color: 'text-secondary',
      bg: 'bg-secondary-container',
    },
  ], [outstandingList, noticesList, timetableRes, attendanceData, classesData]);

  return (
    <>
      <SEOHead title="ERP Dashboard" description="Consolidated school ERP management dashboard" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">ERP Dashboard</h1>
          <p className="text-body-md text-muted-foreground mt-1">Consolidated view of fee, notices, timetable, and attendance</p>
        </motion.div>

        <DataFetchWrapper
          data={statCards}
          isLoading={loading}
          error={hasError ? new Error('Failed to load ERP data') : null}
          onRetry={() => { refetchFee(); refetchNotices(); refetchTt(); refetchAtt(); }}
          loadingType="card"
        >
          {() => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              <section>
                <h2 className="text-title-sm font-semibold text-foreground mb-4">Key Metrics</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {statCards.map((s, i) => (
                    <motion.div key={s.label} variants={cardStackReveal} custom={i}>
                      <Card className="border-border/60 h-full">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                              <Icon name={s.icon} size={22} className={s.color} />
                            </div>
                          </div>
                          <p className="text-display-xs font-bold tracking-tight mt-4">{s.value}</p>
                          <p className="text-label-sm text-muted-foreground mt-1">{s.label}</p>
                          <p className="text-label-xs text-muted-foreground/60 mt-0.5">{s.sub}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-title-sm font-semibold text-foreground mb-4">Quick Links</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {QUICK_LINKS.map((link) => (
                    <Button key={link.href} variant="outline" className="h-auto p-3 justify-start" asChild>
                      <Link to={link.href}>
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.bg} mr-3`}>
                          <Icon name={link.icon} size={20} className={link.color} />
                        </div>
                        <div className="text-left">
                          <p className="text-title-sm font-semibold">{link.label}</p>
                          <p className="text-label-xs text-muted-foreground">Manage {link.label.toLowerCase()}</p>
                        </div>
                      </Link>
                    </Button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-title-sm font-semibold text-foreground mb-4">Pending Fees Overview</h2>
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    {outstandingList.filter((r: any) => r.balance > 0).length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-muted-foreground">
                        <Icon name="check_circle" size={40} className="text-success/50 mb-3" />
                        <p className="text-title-sm font-semibold">No pending fees</p>
                        <p className="text-label-sm text-muted-foreground">All students are up to date</p>
                      </div>
                    ) : (
                      <div className="border border-border/60 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3">Student</th>
                              <th className="px-4 py-3 text-right">Due</th>
                              <th className="px-4 py-3 text-right">Paid</th>
                              <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-title-sm">
                            {outstandingList.filter((r: any) => r.balance > 0).slice(0, 10).map((item: any) => (
                              <tr key={item.studentId} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 py-3 font-semibold">{item.studentName || item.studentId}</td>
                                <td className="px-4 py-3 text-right font-mono">Rs. {item.totalDue?.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-mono text-success">Rs. {item.totalPaid?.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-error">
                                  Rs. {item.balance?.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/fee">
                          <Icon name="open_in_new" size={14} className="mr-1" />
                          Full Report
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-title-sm font-semibold text-foreground mb-4">Recent Notices</h2>
                <Card className="border-border/60">
                  <CardContent className="p-4 space-y-2">
                    {noticesList.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-muted-foreground">
                        <Icon name="campaign" size={40} className="text-muted-foreground/30 mb-3" />
                        <p className="text-title-sm font-semibold">No notices posted</p>
                      </div>
                    ) : (
                      noticesList.slice(0, 5).map((n: any) => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-title-sm font-semibold truncate">{n.title}</p>
                              {n.priority === 'high' && <Badge variant="destructive" className="text-[9px] h-4 px-1">High</Badge>}
                            </div>
                            <p className="text-label-sm text-muted-foreground line-clamp-1">{n.content}</p>
                            <p className="text-label-xs text-muted-foreground/60 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="text-right pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/noticeboard">
                          <Icon name="open_in_new" size={14} className="mr-1" />
                          All Notices
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </motion.div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
