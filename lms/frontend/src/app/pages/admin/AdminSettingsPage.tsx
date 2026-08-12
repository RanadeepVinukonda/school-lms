import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AcademicYearSelect } from '@/components/ui/academic-year-select';
import { OptionsSelect } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cardStackReveal } from '@/lib/motion';
import { getInitials, formatDate } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { settingsService } from '@/services/settingsService';
import { getAllUsers, getAllClasses } from '@/services/dataService';
import { userService } from '@/services/userService';
import { invalidateClasses } from '@/hooks/useClasses';
import { getUserDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import api from '@/services/api';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import ProfilePreferences from '@/components/profile/ProfilePreferences';
import { useAuthStore } from '@/store/authStore';
import { useActiveAcademicYear } from '@/context/ActiveAcademicYearContext';
import { AcademicYearsManager } from '@/app/pages/admin/AdminAcademicYearsPage';
import type { UserDoc } from '@/services/dataService';
import type { DependencyReport } from '@/services/dependencyService';
import type { User } from '@/types';

// Audit Logs Types
interface AuditLog {
  id: string;
  action: string;
  targetId: string;
  targetType: string;
  targetName: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  summary: string;
  timestamp: string;
}

interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  activate: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  deactivate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  release: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function getActionBadge(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  const className = key ? ACTION_COLORS[key] : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  return <Badge className={className}>{action}</Badge>;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(() => (tabParam === 'profile' ? 'profile' : 'general'));

  useEffect(() => {
    if (tabParam === 'profile' || tabParam === 'general' || tabParam === 'parents' || tabParam === 'audit' || tabParam === 'academic-year') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const { refresh: refreshActiveYear, activeYear: ctxActiveYear } = useActiveAcademicYear();

  // -------------------------------------------------------------
  // TAB 1: GENERAL SETTINGS
  // -------------------------------------------------------------
  const [threshold, setThreshold] = useState<number>(50);
  const [schoolName, setSchoolName] = useState<string>('Genesis Academy');
  const [academicYear, setAcademicYear] = useState<string>('');
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
  const adminCount = users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length;
  const classCount = classes.length;

  const adminSelf = useMemo(() => users.find((u) => u.id === authUser?.id), [users, authUser?.id]);

  const statsConfig = [
    { icon: 'school', label: 'Students', value: `${studentCount} Active`, bg: 'bg-primary-container text-on-primary-container' },
    { icon: 'badge', label: 'Teachers', value: `${teacherCount} Active`, bg: 'bg-success-container text-on-success-container' },
    { icon: 'groups', label: 'Admins', value: `${adminCount} Active`, bg: 'bg-info-container text-on-info-container' },
    { icon: 'class', label: 'Classes', value: `${classCount} Active`, bg: 'bg-warning-container text-on-warning-container' },
  ];

  // Load Settings
  const { data: settings, isLoading: settingsLoading, isError: settingsError, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-settings-data'],
    queryFn: () => settingsService.getSettings(),
  });

  useEffect(() => {
    if (settings) {
      setThreshold(settings.conceptFlaggingThreshold ?? 50);
      setSchoolName(settings.schoolName ?? 'Genesis Academy');
      setAcademicYear(settings.academicYear ?? ctxActiveYear ?? '');
      setSemester(settings.semester ?? 'First Semester');
    }
  }, [settings, ctxActiveYear]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsService.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-settings-data'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
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

  // Parent Registration
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [parentForm, setParentForm] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    relationship: '',
    selectedStudentIds: [] as string[],
  });
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    const studentUsers = users.filter((u: any) => u.role === 'student');
    if (!studentSearchQuery) return studentUsers.slice(0, 20);
    const q = studentSearchQuery.toLowerCase();
    return studentUsers.filter((u: any) =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.studentId || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [users, studentSearchQuery]);

  const toggleStudentSelection = (id: string) => {
    setParentForm((f) => ({
      ...f,
      selectedStudentIds: f.selectedStudentIds.includes(id)
        ? f.selectedStudentIds.filter((x) => x !== id)
        : [...f.selectedStudentIds, id],
    }));
  };

  const createParentMutation = useMutation({
    mutationFn: async () => {
      const body = {
        displayName: parentForm.displayName,
        email: parentForm.email,
        password: parentForm.password,
        role: 'parent',
        phone: parentForm.phone || undefined,
        address: parentForm.address,
        relationship: parentForm.relationship,
        childrenIds: parentForm.selectedStudentIds,
      };
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Request timed out. Please try again.')), 15000);
      });
      try {
        const res = await Promise.race([api.post('/auth/users', body), timeout]);
        return res;
      } finally {
        clearTimeout(timer!);
      }
    },
    onSuccess: () => {
      setShowCreateParent(false);
      setParentForm({ displayName: '', email: '', password: '', phone: '', address: '', relationship: '', selectedStudentIds: [] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      invalidateClasses(queryClient);
      toast.success('Parent account created');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to create parent';
      toast.error(msg);
      console.error('[CreateParent]', msg, err);
    },
  });

  // Parents list
  const [parentSearch, setParentSearch] = useState('');

  // Edit Parent state
  const [editParentTarget, setEditParentTarget] = useState<any | null>(null);
  const [editParentChildren, setEditParentChildren] = useState<string[]>([]);
  const [newChildId, setNewChildId] = useState('');
  const [showDeleteParentDialog, setShowDeleteParentDialog] = useState(false);
  const [deleteParentTarget, setDeleteParentTarget] = useState<any | null>(null);
  const [parentDeleteLoading, setParentDeleteLoading] = useState(false);
  const [parentDependencyReport, setParentDependencyReport] = useState<DependencyReport | null>(null);

  const parentUsers = useMemo(() => {
    return users.filter((u) => u.role === 'parent');
  }, [users]);

  const filteredParentUsers = useMemo(() => {
    const q = parentSearch.toLowerCase();
    return parentUsers.filter((u) => (u.displayName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  }, [parentUsers, parentSearch]);

  const toggleUserStatusMutation = useMutation({
    mutationFn: (id: string) => userService.toggleActive(id),
    onSuccess: () => {
      toast.success('User active status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to toggle status'),
  });

  const editParentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userService.update(id, data),
    onSuccess: () => {
      toast.success('Parent updated');
      setEditParentTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update parent'),
  });

  const deleteParentMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      toast.success('Parent account deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      setShowDeleteParentDialog(false);
      setDeleteParentTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete parent'),
  });

  // -------------------------------------------------------------
  // TAB 3: AUDIT LOGS
  // -------------------------------------------------------------
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const auditLogsQuery = useQuery({
    queryKey: ['admin-audit-logs', auditPage, auditActionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(auditPage), limit: '10' });
      if (auditActionFilter) params.set('action', auditActionFilter);
      const res = await api.get(`/audit-logs?${params}`);
      return { items: res.data.data as AuditLog[], pagination: res.data.pagination as AuditPagination };
    },
    enabled: activeTab === 'audit',
  });

  const recoverMutation = useMutation({
    mutationFn: async (logId: string) => {
      await api.post(`/audit-logs/recover/${logId}`);
    },
    onSuccess: () => {
      setSelectedLog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success('Entity recovered successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to recover entity');
    },
  });

  const handleAuditPrev = useCallback(() => {
    if (auditLogsQuery.data?.pagination.hasPrev) setAuditPage((p) => p - 1);
  }, [auditLogsQuery.data?.pagination.hasPrev]);

  const handleAuditNext = useCallback(() => {
    if (auditLogsQuery.data?.pagination.hasNext) setAuditPage((p) => p + 1);
  }, [auditLogsQuery.data?.pagination.hasNext]);

  return (
    <>
      <SEOHead title="Settings & Logs" description="System configuration, administrators, and audit trails" canonical="/admin/settings" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="space-y-16">
          <div>
            <h1 className="text-headline-sm font-bold">Settings & Audit Hub</h1>
            <p className="text-body-md text-muted-foreground">General configurations, admin settings, and full system audit logs</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md inline-flex overflow-x-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="parents">Parents</TabsTrigger>
              <TabsTrigger value="academic-year">Academic Year</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>

            {/* -------------------------------------------------------------
                TAB CONTENT: PROFILE
               ------------------------------------------------------------- */}
            <TabsContent value="profile" className="mt-4 space-y-6">
              <ProfileHeader user={adminSelf ?? authUser ?? {}} roleLabel="Administrator" editHref={ROUTES.ADMIN_PROFILE_EDIT} />
              <ProfileDetails user={adminSelf ?? authUser ?? {}} />
              <ProfilePreferences />
            </TabsContent>

            {/* -------------------------------------------------------------
                TAB CONTENT: GENERAL SETTINGS
               ------------------------------------------------------------- */}
            <TabsContent value="general" className="mt-4 space-y-6">
              <DataFetchWrapper
                data={settings}
                isLoading={settingsLoading}
                error={settingsError ? new Error('Failed to load settings') : null}
                onRetry={refetchSettings}
                loadingType="card"
              >
                {() => (
                  <div className="space-y-6">
                    {/* System Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      {statsConfig.map((stat) => (
                        <Card key={stat.label} className="border-border/60">
                          <CardContent className="p-5 flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                              <Icon name={stat.icon} size={20} />
                            </div>
                            <div>
                              <p className="text-display-xs font-bold">{stat.value}</p>
                              <p className="text-label-xs text-muted-foreground">{stat.label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* School Info Card */}
                      <Card className="border-border/60">
                        <CardHeader>
                          <CardTitle className="text-title-md flex items-center gap-2">
                            <Icon name="school" size={18} className="text-muted-foreground" />
                            School Information
                          </CardTitle>
                          <CardDescription>Configure basic branding and details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>School Name</Label>
                            <Input className="border-border/60 placeholder:text-muted-foreground" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Academic Year</Label>
                              <AcademicYearSelect
                                value={academicYear}
                                onChange={(v) => setAcademicYear(v)}
                                className="border-border/60"
                                globalSwitcher
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Semester</Label>
                              <Input className="border-border/60 placeholder:text-muted-foreground" value={semester} onChange={(e) => setSemester(e.target.value)} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Flagging Policy Card */}
                      <Card className="border-border/60">
                        <CardHeader>
                          <CardTitle className="text-title-md flex items-center gap-2">
                            <Icon name="flag" size={18} className="text-muted-foreground" />
                            Performance Flagging Policy
                          </CardTitle>
                          <CardDescription>Oversight warning thresholds for low-performing concepts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <Label className="text-body-md font-semibold text-muted-foreground">Warning Threshold Percent</Label>
                              <span className={`text-lg font-bold font-mono ${getThresholdColor(threshold)}`}>
                                {threshold}%
                              </span>
                            </div>
                            <p className="text-label-xs text-muted-foreground leading-relaxed">
                              Concepts with average assessment performance below this trigger will flag warning indicators on the administrator dashboard, indicating student comprehension gaps.
                            </p>
                            <div className="flex items-center gap-4 py-2">
                              <input
                                type="range"
                                min="10"
                                max="95"
                                step="5"
                                value={threshold}
                                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                                className="flex-1 h-2 bg-secondary-container rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium font-mono px-1">
                              <span>10% (Low)</span>
                              <span>50% (Medium)</span>
                              <span>95% (High)</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="outline" onClick={() => refetchSettings()}>Discard Changes</Button>
                      <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>

            {/* -------------------------------------------------------------
                TAB CONTENT: PARENTS
               ------------------------------------------------------------- */}
            <TabsContent value="parents" className="mt-4 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="relative max-w-sm flex-1">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search parents..."
                    className="pl-10 border-border/60 placeholder:text-muted-foreground"
                    value={parentSearch}
                    onChange={(e) => setParentSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => setShowCreateParent(true)}>
                  <Icon name="add" size={16} className="mr-2" />
                  Register Parent
                </Button>
              </div>

              {filteredParentUsers.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="flex flex-col items-center gap-4 py-16">
                    <Icon name="family_link" size={48} className="text-muted-foreground/50" />
                    <p className="text-title-sm font-medium">No parents registered yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Parent</th>
                        <th className="text-left px-4 py-3">Email</th>
                        <th className="text-left px-4 py-3">Children</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredParentUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors text-body-md">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(u.displayName)}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{u.displayName}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm select-all">{u.email}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {(u as any).childrenIds?.length ? `${(u as any).childrenIds.length} linked` : 'None'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={u.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                              {u.isActive === false ? 'Inactive' : 'Active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditParentTarget(u);
                                setEditParentChildren((u as any).childrenIds || []);
                                setNewChildId('');
                              }}
                              title="Edit parent"
                            >
                              <Icon name="edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => toggleUserStatusMutation.mutate(u.id)}
                              title={u.isActive === false ? 'Enable user login' : 'Disable user login'}
                            >
                              <Icon name={u.isActive === false ? 'toggle_off' : 'toggle_on'} size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => { setDeleteParentTarget(u); setShowDeleteParentDialog(true); }}
                              title="Delete parent"
                            >
                              <Icon name="delete" size={16} className="text-error" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* -------------------------------------------------------------
                TAB CONTENT: ACADEMIC YEAR
               ------------------------------------------------------------- */}
            <TabsContent value="academic-year" className="mt-4 space-y-6">
              <AcademicYearsManager onYearChanged={() => refreshActiveYear()} />
            </TabsContent>

            {/* -------------------------------------------------------------
                TAB CONTENT: AUDIT LOGS
               ------------------------------------------------------------- */}
            <TabsContent value="audit" className="mt-4 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-title-md font-bold">System Audit Trail</h3>
                  <p className="text-body-md text-muted-foreground">Track all system changes and administrative actions</p>
                </div>
                <Input
                  placeholder="Search audit actions (e.g. class.create)..."
                  value={auditActionFilter}
                  onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                  className="max-w-xs border-border/60 placeholder:text-muted-foreground"
                />
              </div>

              <DataFetchWrapper
                data={auditLogsQuery.data?.items}
                isLoading={auditLogsQuery.isLoading}
                error={auditLogsQuery.error}
                loadingType="list"
              >
                {(items) => (
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">No audit trail records found.</p>
                    ) : (
                      items.map((log) => (
                        <Card
                          key={log.id}
                          className="border-border/60 cursor-pointer hover:border-primary/20 hover:shadow-elevation-1"
                          onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {getActionBadge(log.action)}
                                  <span className="text-title-sm font-semibold truncate">{log.summary}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground font-medium">
                                  <span>Performed by: <span className="text-primary">{log.performedByName}</span> ({log.performedByRole})</span>
                                  <span>&middot;</span>
                                  <span>{formatDate(log.timestamp)}</span>
                                </div>
                              </div>
                              <Icon name={selectedLog?.id === log.id ? 'expand_less' : 'expand_more'} size={18} className="text-muted-foreground" />
                            </div>

                            {selectedLog?.id === log.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                className="mt-3 pt-3 border-t border-border/60 space-y-3 text-label-xs"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground font-medium">
                                  <div><span className="text-muted-foreground font-semibold">Target Object:</span> {log.targetType} "{log.targetName}"</div>
                                  <div><span className="text-muted-foreground font-semibold">Performed ID:</span> {log.performedBy}</div>
                                </div>
                                {log.oldValue && (
                                  <div>
                                    <span className="text-muted-foreground font-semibold block mb-1">Old State:</span>
                                    <pre className="p-2.5 rounded bg-muted/40 border border-border font-mono overflow-x-auto text-[11px]">{JSON.stringify(log.oldValue, null, 2)}</pre>
                                  </div>
                                )}
                                {log.newValue && (
                                  <div>
                                    <span className="text-muted-foreground font-semibold block mb-1">New State:</span>
                                    <pre className="p-2.5 rounded bg-muted/40 border border-border font-mono overflow-x-auto text-[11px]">{JSON.stringify(log.newValue, null, 2)}</pre>
                                  </div>
                                )}
                                {log.action.includes('delete') && log.oldValue && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); recoverMutation.mutate(log.id); }}
                                    disabled={recoverMutation.isPending}
                                  >
                                    <Icon name="restore" size={14} className="mr-1" />
                                    Recover Deleted Entity
                                  </Button>
                                )}
                              </motion.div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}

                    {auditLogsQuery.data?.pagination && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-label-xs text-muted-foreground font-medium">
                          Page {auditLogsQuery.data.pagination.page} of {auditLogsQuery.data.pagination.totalPages} ({auditLogsQuery.data.pagination.total} total logs)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={!auditLogsQuery.data.pagination.hasPrev} onClick={handleAuditPrev}>
                            <Icon name="chevron_left" size={14} className="mr-1" />
                            Previous
                          </Button>
                          <Button variant="outline" size="sm" disabled={!auditLogsQuery.data.pagination.hasNext} onClick={handleAuditNext}>
                            Next
                            <Icon name="chevron_right" size={14} className="ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* -------------------------------------------------------------
          PARENT DIALOGS
         ------------------------------------------------------------- */}

      {/* REGISTER PARENT DIALOG */}
      <Dialog open={showCreateParent} onOpenChange={setShowCreateParent}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Register Parent</DialogTitle>
            <DialogDescription>Create a parent account linked to student(s).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input placeholder="Parent Name" value={parentForm.displayName} onChange={(e) => setParentForm((f) => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="parent@school.edu" value={parentForm.email} onChange={(e) => setParentForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={parentForm.password} onChange={(e) => setParentForm((f) => ({ ...f, password: e.target.value }))} className="pr-12" />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" placeholder="+1 555-123-4567" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input placeholder="123 School St, City, State" value={parentForm.address} onChange={(e) => setParentForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                value={parentForm.relationship}
                onChange={(e) => setParentForm((f) => ({ ...f, relationship: e.target.value }))}
              >
                <option value="">Select relationship...</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Student Mapping *</Label>
              <Input
                placeholder="Search students by name or ID..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
              <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-label-sm text-muted-foreground text-center py-2">No students found</p>
                ) : (
                  filteredStudents.map((s: any) => {
                    const selected = parentForm.selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/30 ${selected ? 'bg-primary/10' : ''}`}
                        onClick={() => toggleStudentSelection(s.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">{s.displayName || s.email}</p>
                          <p className="text-label-xs text-muted-foreground">{s.studentId || s.id?.slice(0, 8)}</p>
                        </div>
                        {selected ? (
                          <Icon name="check_circle" size={18} className="text-primary" />
                        ) : (
                          <Icon name="add_circle_outline" size={18} className="text-muted-foreground" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {parentForm.selectedStudentIds.length > 0 && (
                <p className="text-label-xs text-muted-foreground">{parentForm.selectedStudentIds.length} student(s) selected</p>
              )}
            </div>
            <Button className="w-full mt-2" onClick={() => createParentMutation.mutate()} disabled={!parentForm.displayName || !parentForm.email || !parentForm.password || parentForm.selectedStudentIds.length === 0 || createParentMutation.isPending}>
              {createParentMutation.isPending ? 'Registering...' : 'Register Parent'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT PARENT DIALOG */}
      <Dialog open={!!editParentTarget} onOpenChange={(open) => { if (!open) setEditParentTarget(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Parent: {editParentTarget?.displayName}</DialogTitle>
            <DialogDescription>Manage linked children for this parent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-label-sm text-muted-foreground">Email</p>
              <p className="text-title-sm font-medium">{editParentTarget?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Linked Children</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {editParentChildren.length === 0 ? (
                  <p className="text-label-sm text-muted-foreground text-center py-4">No children linked</p>
                ) : (
                  editParentChildren.map((childId) => {
                    const student = users.find((u: any) => u.id === childId || u.student_id === childId || u.studentId === childId);
                    return (
                      <div key={childId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{student?.displayName || childId}</p>
                          <p className="text-label-xs text-muted-foreground">{student?.studentId || ''}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditParentChildren((prev) => prev.filter((id) => id !== childId))}
                        >
                          <Icon name="close" size={14} className="text-error" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add Child</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search student name or ID..."
                  value={newChildId}
                  onChange={(e) => setNewChildId(e.target.value)}
                  className="flex-1"
                />
              </div>
              {newChildId && (
                <div className="max-h-[120px] overflow-y-auto border rounded-lg p-1">
                  {users
                    .filter((u: any) => u.role === 'student')
                    .filter((u: any) =>
                      (u.displayName || '').toLowerCase().includes(newChildId.toLowerCase()) ||
                      (u.studentId || u.student_id || '').toLowerCase().includes(newChildId.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((student: any) => {
                      const sid = student.studentId || student.student_id || student.id;
                      const alreadyLinked = editParentChildren.includes(sid) || editParentChildren.includes(student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted/30 ${alreadyLinked ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (!alreadyLinked) {
                              setEditParentChildren((prev) => [...prev, sid]);
                              setNewChildId('');
                            }
                          }}
                        >
                          <div>
                            <p className="text-sm font-medium">{student.displayName}</p>
                            <p className="text-label-xs text-muted-foreground">{sid}</p>
                          </div>
                          {alreadyLinked ? (
                            <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                          ) : (
                            <Icon name="add" size={16} className="text-primary" />
                          )}
                        </div>
                      );
                    })}
                  {users.filter((u: any) => u.role === 'student').filter((u: any) =>
                    (u.displayName || '').toLowerCase().includes(newChildId.toLowerCase()) ||
                    (u.studentId || u.student_id || '').toLowerCase().includes(newChildId.toLowerCase())
                  ).length === 0 && (
                    <p className="text-label-sm text-muted-foreground text-center py-2">No students found</p>
                  )}
                </div>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => editParentMutation.mutate({ id: editParentTarget.id, data: { childrenIds: editParentChildren } })}
              disabled={editParentMutation.isPending}
            >
              {editParentMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE PARENT DIALOG */}
      <Dialog open={showDeleteParentDialog} onOpenChange={(open) => { if (!open) { setShowDeleteParentDialog(false); setDeleteParentTarget(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Parent: {deleteParentTarget?.displayName}</DialogTitle>
            <DialogDescription className="text-destructive">
              This will permanently delete the parent account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteParentDialog(false); setDeleteParentTarget(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteParentMutation.mutate(deleteParentTarget.id)}
              disabled={deleteParentMutation.isPending}
            >
              {deleteParentMutation.isPending ? 'Deleting...' : 'Delete Parent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </>
  );
}
