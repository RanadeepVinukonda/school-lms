import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { getInitials } from '@/lib/utils';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { userService, type CreateUserInput } from '@/services/userService';
import { getUserDependencies } from '@/services/dependencyService';
import { logAudit } from '@/services/auditService';
import type { User } from '@/types';
import type { DependencyReport } from '@/services/dependencyService';

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

const creationRoleOptions = [
  { value: 'admin', label: 'Admin' },
];

const roleBadgeColors: Record<string, string> = {
  student: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  teacher: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  admin: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  super_admin: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ displayName: '', email: '', password: '', role: 'admin' });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () => userService.getAll({ page, limit: 10, search: search || undefined, role: roleFilter !== 'all' ? roleFilter : undefined }),
  });

  const users = (data as unknown as { data?: User[]; pagination?: { total: number; page: number; limit: number } }) ?? {};
  const items = (users as { data?: User[] }).data ?? [];
  const pagination = (users as { pagination?: { total: number; page: number; limit: number } }).pagination ?? { total: 0, page: 1, limit: 10 };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const createMutation = useMutation({
    mutationFn: () =>
      userService.create({
        displayName: createForm.displayName,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role as CreateUserInput['role'],
      }),
    onSuccess: () => {
      toast.success('User created');
      setShowCreate(false);
      setCreateForm({ displayName: '', email: '', password: '', role: 'admin' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create user'),
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      logAudit({
        action: 'user.delete',
        targetId: deleteTarget?.id || '',
        targetType: 'user',
        targetName: deleteTarget?.name || 'Unknown',
        summary: `Permanently deleted user "${deleteTarget?.name}"`,
      });
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowDependencyDialog(false);
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete user'),
  });

  const handleDeleteClick = async (user: User) => {
    setDeleteTarget({ id: user.id, name: user.displayName });
    setDeleteLoading(true);
    setDependencyReport(null);
    setShowDependencyDialog(true);
    try {
      const report = await getUserDependencies(user.id);
      setDependencyReport(report);
    } catch {
      setDependencyReport(null);
    }
    setDeleteLoading(false);
  };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => userService.toggleActive(id),
    onSuccess: () => {
      const user = items.find((u) => u.id === deleteTarget?.id);
      logAudit({
        action: user?.isActive ? 'user.deactivate' : 'user.activate',
        targetId: deleteTarget?.id || '',
        targetType: 'user',
        targetName: deleteTarget?.name || 'Unknown',
        summary: user?.isActive
          ? `Deactivated user "${deleteTarget?.name}"`
          : `Activated user "${deleteTarget?.name}"`,
        newValue: { isActive: !user?.isActive },
      });
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update user'),
  });

  return (
    <>
      <SEOHead title="User Management" description="Manage system users" canonical="/admin/users" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-5xl mx-auto pb-20 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm">User Management</h1>
            <p className="text-sm text-on-surface-variant">{pagination.total} total users</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Icon name="add" size={16} className="mr-2" />
            Add User
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <Input placeholder="Search users..." className="pl-10" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <OptionsSelect
            options={[{ value: 'all', label: 'All Roles' }, ...roleOptions]}
            value={roleFilter}
            onChange={(v: string) => { setRoleFilter(v); setPage(1); }}
            className="w-32"
          />
        </div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load users') : null}
          onRetry={() => refetch()}
          loadingType="table"
          emptyMessage="No users found"
          emptyAction={
            <Button onClick={() => setShowCreate(true)}>
              <Icon name="add" size={16} className="mr-2" />
              Create User
            </Button>
          }
        >
          {() => items.length > 0 ? (
            <motion.div variants={listContainer} initial="hidden" animate="show">
              <Card>
                <CardContent className="p-0 divide-y divide-outline-variant">
                  {items.map((u) => (
                    <motion.div key={u.id} variants={listItem} className="flex items-center gap-3 p-3 hover:bg-surface-variant/40 transition-colors">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{getInitials(u.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-body-md font-medium truncate">{u.displayName}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleBadgeColors[u.role] ?? ''}`}>
                            {u.role}
                          </span>
                          {!u.isActive && <Icon name="block" size={14} className="text-error" />}
                        </div>
                        <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                      </div>
                      <div className="text-right text-xs text-on-surface-variant flex-shrink-0 space-y-1">
                        <p>{new Date(u.createdAt).toLocaleDateString()}</p>
                        <Badge variant={u.isActive ? 'success' : 'secondary'} className="text-[10px]">
                          {u.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleMutation.mutate(u.id)}
                          title={u.isActive ? 'Disable user' : 'Enable user'}
                        >
                          <Icon name={u.isActive ? 'toggle_off' : 'toggle_on'} size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-error"
                          onClick={() => handleDeleteClick(u)}
                          disabled={deleteMutation.isPending}
                          title="Delete user"
                        >
                          <Icon name="delete" size={16} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <Icon name="chevron_left" size={18} />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={page === i + 1 ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <Icon name="chevron_right" size={18} />
                  </Button>
                </div>
              )}
            </motion.div>
          ) : null}
        </DataFetchWrapper>

      <Dialog open={showDependencyDialog} onOpenChange={(open) => { if (!open) { setShowDependencyDialog(false); setDeleteTarget(null); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name || 'User'}</DialogTitle>
            <DialogDescription>
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Icon name="sync" size={16} className="animate-spin" />
                  Analyzing user dependencies...
                </span>
              ) : dependencyReport && dependencyReport.totalDependents > 0 ? (
                <span className="text-destructive font-medium">
                  {dependencyReport.totalDependents} dependenc{dependencyReport.totalDependents === 1 ? 'y' : 'ies'} found.
                </span>
              ) : dependencyReport ? (
                <span className="text-success font-medium">No dependencies found.</span>
              ) : (
                'Unable to analyze dependencies.'
              )}
            </DialogDescription>
          </DialogHeader>

          {dependencyReport && dependencyReport.categories.length > 0 && (
            <div className="space-y-2 rounded-lg border border-outline-variant p-4">
              <p className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">
                Impact Summary
              </p>
              {dependencyReport.categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-body-md">
                  <span>{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{cat.count}</Badge>
                    {cat.action && <span className="text-xs text-on-surface-variant">{cat.action}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="tonal"
              className="w-full justify-start"
              onClick={() => {
                if (deleteTarget) toggleMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending}
            >
              <Icon name="toggle_off" size={16} className="mr-2" />
              Deactivate User (recommended)
              <span className="ml-auto text-xs text-on-surface-variant">Preserves all records</span>
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending || (dependencyReport?.totalDependents ?? 0) > 0}
              loading={deleteMutation.isPending}
            >
              <Icon name="delete_forever" size={16} className="mr-2" />
              Permanently Delete
              <span className="ml-auto text-xs text-on-surface-variant">
                {(dependencyReport?.totalDependents ?? 0) > 0 ? 'Has dependencies' : 'Irreversible'}
              </span>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { setShowDependencyDialog(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="john@school.edu"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Min 8 chars, upper+lower+number+special"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <OptionsSelect
                  options={creationRoleOptions}
                  value={createForm.role}
                  onChange={(v: string) => setCreateForm((f) => ({ ...f, role: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!createForm.displayName || !createForm.email || !createForm.password || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <><Icon name="sync" size={16} className="mr-2 animate-spin" />Creating...</>
                ) : (
                  <><Icon name="add" size={16} className="mr-2" />Create User</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
