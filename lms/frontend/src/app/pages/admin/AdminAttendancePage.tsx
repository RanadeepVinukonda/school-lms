import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { attendanceService } from '@/services/attendanceService';
import { exportFileOnNative } from '@/lib/native';
import ClassSelect from '@/components/common/ClassSelect';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';

export default function AdminAttendancePage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [exporting, setExporting] = useState(false);
  const { data: classes = [] } = useClasses();

  const { data: reportData, isLoading: reportLoading, isError: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['attendance-report', selectedClass],
    queryFn: () => attendanceService.getAttendanceReport(selectedClass).then((r) => r.data),
    enabled: !!selectedClass,
  });

  return (
    <>
      <SEOHead title="Attendance Management" description="Track student and teacher attendance" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Attendance Management</h1>
          <p className="text-body-md text-muted-foreground mt-1">Track and manage attendance records</p>
        </motion.div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <ClassSelect
              value={selectedClass}
              onChange={setSelectedClass}
              placeholder="Select a class..."
              className="h-10 w-full pl-10 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            />
          </div>
        </div>

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
                  <Button variant="outline" disabled={exporting} onClick={async () => {
                    if (exporting) return;
                    setExporting(true);
                    try {
                      const blob: Blob = await attendanceService.exportAttendanceCSV(selectedClass).then((r: any) => r);
                      // If the server answered with an error page (JSON), surface it
                      // instead of silently downloading a broken .csv file.
                      if (blob && blob.type && blob.type.includes('json')) {
                        const text = await blob.text();
                        let msg = 'Failed to export';
                        try {
                          const parsed = JSON.parse(text);
                          msg = parsed?.error?.message || parsed?.message || msg;
                        } catch { /* keep default */ }
                        toast.error(msg);
                        return;
                      }
                      // Useful, human-readable filename, e.g.
                      // Attendance_Grade_1_B_2026-08-12.csv
                      const cls = classes.find((c) => c.id === selectedClass);
                      const label = (formatClassName(cls) || selectedClass).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                      const now = new Date();
                      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const filename = `Attendance_${label || 'Class'}_${date}.csv`;
                      // On the mobile app, the FileShare native plugin writes the real
                      // .csv and opens the Android Open With / Share chooser with a
                      // content:// URI — WebViews swallow downloads, so the file
                      // would otherwise be lost. No clipboard involved.
                      const native = await exportFileOnNative(blob, filename, 'text/csv');
                      if (native === 'shared') {
                        toast.success('Attendance CSV ready — choose an app to open it');
                        return;
                      }
                      if (native === 'failed') {
                        toast.error('Export failed — no app available to open the CSV on this device');
                        return;
                      }
                      if (native === 'dismissed') {
                        toast.info('Attendance export cancelled');
                        return;
                      }
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = filename;
                      // Append to the DOM: some engines (Firefox, Android WebView)
                      // ignore click() on detached anchors.
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      // Revoke on a timer so the browser finishes reading the blob.
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      toast.success('Attendance exported');
                    } catch {
                      toast.error('Failed to export');
                    } finally {
                      setExporting(false);
                    }
                  }}>
                    <Icon name="download" size={16} className="mr-1.5" />
                    Export CSV
                  </Button>
                </div>

                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-title-sm">Attendance Summary</CardTitle>
                      {reportData?.yearStart && (
                        <span className="text-label-sm text-muted-foreground">
                          From {new Date(reportData.yearStart).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(!reportData?.summary || Object.keys(reportData.summary).length === 0) ? (
                      <p className="text-muted-foreground text-center py-8">No students found</p>
                    ) : (
                      <div className="border border-border/60 rounded-xl overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3">#</th>
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
                            {(Object.entries(reportData.summary) as [string, any][]).sort(([, a], [, b]) => String(a.rollNo ?? '').localeCompare(String(b.rollNo ?? ''))).map(([studentId, data], idx: number) => {
                              const pct = data.percentage ?? 0;
                              return (
                                <tr key={studentId} className="hover:bg-muted/20">
                                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                  <td className="px-4 py-3 font-semibold">{data.studentName || studentId}</td>
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
      </div>
    </>
  );
}
