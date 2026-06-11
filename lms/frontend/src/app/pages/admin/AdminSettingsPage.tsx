import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { settingsService } from '@/services/settingsService';
import { getAllUsers, getAllClasses } from '@/services/dataService';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [threshold, setThreshold] = useState<number>(50);
  const [schoolName, setSchoolName] = useState<string>('Genesis Academy');
  const [academicYear, setAcademicYear] = useState<string>('2026');
  const [semester, setSemester] = useState<string>('First Semester');

  // Load backend stats
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: getAllUsers,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes-stats'],
    queryFn: getAllClasses,
  });

  const studentCount = users.filter((u) => u.role === 'student').length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const userCount = users.length;
  const classCount = classes.length;

  const statsConfig = [
    { icon: 'school', label: 'Students', value: `${studentCount} Active`, bg: 'bg-primary-container text-on-primary-container' },
    { icon: 'badge', label: 'Teachers', value: `${teacherCount} Active`, bg: 'bg-success-container text-on-success-container' },
    { icon: 'group', label: 'Users', value: `${userCount} Total`, bg: 'bg-info-container text-on-info-container' },
    { icon: 'class', label: 'Classes', value: `${classCount} Active`, bg: 'bg-warning-container text-on-warning-container' },
  ];

  // Load Settings
  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings-data'],
    queryFn: () => settingsService.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      setThreshold(settings.conceptFlaggingThreshold ?? 50);
      setSchoolName(settings.schoolName ?? 'Genesis Academy');
      setAcademicYear(settings.academicYear ?? '2026');
      setSemester(settings.semester ?? 'First Semester');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-settings-data'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      schoolName,
      academicYear,
      semester,
      conceptFlaggingThreshold: threshold,
    });
  };

  const getThresholdColor = (val: number) => {
    if (val < 40) return 'text-error';
    if (val < 60) return 'text-warning';
    return 'text-success';
  };

  return (
    <>
      <SEOHead title="Settings" description="System configuration settings" canonical="/admin/settings" />
      <DataFetchWrapper
        data={settings}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load settings') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={listItem}>
                <h1 className="text-headline-sm">Settings</h1>
                <p className="text-sm text-on-surface-variant">School configuration and performance threshold policies</p>
              </motion.div>

              <motion.div
                variants={listItem}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                {statsConfig.map((stat) => (
                  <Card key={stat.label} variant="elevated">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                        <Icon name={stat.icon} size={20} />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{stat.value}</p>
                        <p className="text-xs text-on-surface-variant">{stat.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* School Info Form */}
                <motion.div variants={listItem}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="school" size={18} className="text-on-surface-variant" />
                        School Information
                      </CardTitle>
                      <CardDescription>General application details and context</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>School Name</Label>
                        <Input
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Academic Year</Label>
                          <Input
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Semester</Label>
                          <Input
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Concept Flagging Threshold Form */}
                <motion.div variants={listItem}>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="flag" size={18} className="text-on-surface-variant" />
                        Performance Flagging Policy
                      </CardTitle>
                      <CardDescription>Configure concept warning triggers for re-teaching oversight</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Label className="text-body-md font-medium">Flagging Warning Threshold</Label>
                          <span className={`text-lg font-bold font-mono ${getThresholdColor(threshold)}`}>
                            {threshold}%
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          This controls the threshold at which concepts are marked as "low performance" on the Oversight Dashboard. 
                          If the average test score for a concept across students in a class drops below this percent, 
                          the system will flag it, prompting you to request a re-teach from the assigned teacher.
                        </p>
                        <div className="flex items-center gap-4 py-2">
                          <input
                            type="range"
                            min="10"
                            max="90"
                            step="5"
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                            className="flex-1 h-2 bg-secondary-container rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-on-surface-variant font-medium font-mono px-1">
                          <span>10% (Lenient)</span>
                          <span>50% (Standard)</span>
                          <span>90% (Strict)</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={listItem} className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                  <Icon name="refresh" size={16} className="mr-2" />
                  Discard Changes
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Icon name="sync" size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="save" size={16} className="mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>
    </>
  );
}
