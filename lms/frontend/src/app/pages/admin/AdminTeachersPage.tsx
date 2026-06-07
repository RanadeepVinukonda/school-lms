import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getUserByRole } from '@/services/dataService';
import { userService } from '@/services/userService';

interface TeacherForm {
  name: string;
  email: string;
  password: string;
}

const emptyForm: TeacherForm = { name: '', email: '', password: '' };

export default function AdminTeachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TeacherForm>(emptyForm);

  const { data: teachers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => getUserByRole('teacher'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      userService.create({
        displayName: form.name,
        email: form.email,
        password: form.password,
        role: 'teacher',
      }),
    onSuccess: () => {
      toast.success(`Teacher ${form.name} created`);
      setForm(emptyForm);
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create teacher'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      toast.success('Teacher deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete teacher'),
  });

  const filtered = useMemo(
    () =>
      teachers.filter((t) => {
        const q = search.toLowerCase();
        return t.displayName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
      }),
    [teachers, search]
  );

  return (
    <>
      <SEOHead title="Teachers" description="Manage teachers" canonical="/admin/teachers" />
      <DataFetchWrapper
        data={teachers}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load teachers') : null}
        onRetry={() => refetch()}
        loadingType="table"
      >
        {() => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Teachers</h1>
                <p className="text-sm text-on-surface-variant">{teachers.length} total teachers</p>
              </div>
              <Button onClick={() => setShowAdd(true)}>
                <Icon name="add" size={18} className="mr-2" />
                Add Teacher
              </Button>
            </motion.div>

            <motion.div variants={listItem}>
              <div className="relative max-w-sm">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {teachers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="badge" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No teachers yet</p>
                      <p className="text-sm text-on-surface-variant">Add your first teacher to get started.</p>
                      <Button onClick={() => setShowAdd(true)}>
                        <Icon name="add" size={18} className="mr-2" />
                        Add Teacher
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No teachers match your search</p>
                      <p className="text-sm text-on-surface-variant">Try a different search term.</p>
                      <Button variant="outline" onClick={() => setSearch('')}>
                        <Icon name="close" size={16} className="mr-2" />
                        Clear Search
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div variants={listItem}>
                <div className="border-outline-variant rounded-lg overflow-hidden border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-outline-variant border-b bg-surface-variant/50">
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Name</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Email</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Teacher ID</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="text-right text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-outline-variant divide-y">
                      {filtered.map((teacher) => {
                        return (
                          <tr key={teacher.id} className="hover:bg-surface-variant/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-body-md font-medium">{teacher.displayName}</span>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant">{teacher.email}</td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{teacher.teacherId || '\u2014'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={teacher.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                                {teacher.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Edit teacher')}>
                                  <Icon name="edit" size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => deleteMutation.mutate(teacher.id)}
                                >
                                  <Icon name="delete" size={16} className="text-error" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            </motion.div>
          </motion.div>
        )}
      </DataFetchWrapper>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>Enter the teacher details and assign subjects.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Dr. Smith"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="smith@school.edu"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Temporary password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              disabled={createMutation.isPending}
              onClick={() => {
                if (!form.name || !form.email || !form.password) {
                  toast.error('Please fill in name, email, and password');
                  return;
                }
                createMutation.mutate();
              }}
            >
              <Icon name="person_add" size={16} className="mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Add Teacher'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
