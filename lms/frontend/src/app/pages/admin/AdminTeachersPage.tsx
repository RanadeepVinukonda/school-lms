import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { userService } from '@/services/userService';
import { SEOHead } from '@/components/common/SEOHead';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getUserByRole } from '@/services/dataService';

export default function AdminTeachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ displayName: '', email: '' });
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    generatedPassword?: string;
    displayName: string;
  } | null>(null);

  const { data: teachers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => getUserByRole('teacher'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      userService.create({
        displayName: createForm.displayName,
        email: createForm.email || undefined,
        role: 'teacher',
      }),
    onSuccess: (res: any) => {
      const teacherData = res.data;
      setCreatedCredentials({
        email: teacherData.email,
        generatedPassword: teacherData.generatedPassword,
        displayName: teacherData.displayName,
      });
      setShowCreate(false);
      setCreateForm({ displayName: '', email: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create teacher');
    },
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
      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : isError ? (
        <ErrorState title="Failed to load teachers" message="Could not fetch teacher data" onRetry={() => refetch()} />
      ) : (
        <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Teachers</h1>
                <p className="text-sm text-on-surface-variant">{teachers.length} total teachers</p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="add" size={16} className="mr-2" />
                Register Teacher
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
                      <p className="text-sm text-on-surface-variant">Register the first teacher to get started.</p>
                      <Button onClick={() => setShowCreate(true)}>
                        <Icon name="add" size={16} className="mr-2" />
                        Register Teacher
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No teachers match your search</p>
                      <p className="text-sm text-on-surface-variant">Try a different search term.</p>
                      <button className="text-sm text-primary hover:underline" onClick={() => setSearch('')}>
                        Clear Search
                      </button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div variants={listItem}>
                <div className="border-outline-variant rounded-lg overflow-x-auto border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-outline-variant border-b bg-surface-variant/50">
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Name</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Email</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Teacher ID</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Status</th>
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

      {/* CREATE TEACHER DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Teacher</DialogTitle>
            <DialogDescription>Create a new teacher account. Custom login credentials will be generated automatically if email is left blank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="Jane Doe"
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                placeholder="jane@school.edu"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createForm.displayName || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />Registering...</>
              ) : (
                <><Icon name="add" size={16} className="mr-2" />Register Teacher</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREDENTIALS MODAL */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Icon name="check_circle" size={24} />
              Teacher Credentials Generated
            </DialogTitle>
            <DialogDescription>
              Please copy these credentials and share them with the teacher. This is the only time the password is shown.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 bg-surface-variant/40 p-4 rounded-lg border border-outline-variant font-mono text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-outline-variant/60 pb-2">
                <span className="font-bold text-on-surface-variant">Name:</span>
                <span className="col-span-2 select-all font-sans font-medium">{createdCredentials.displayName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-outline-variant/60 pb-2">
                <span className="font-bold text-on-surface-variant">Email:</span>
                <span className="col-span-2 select-all">{createdCredentials.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-bold text-on-surface-variant">Password:</span>
                <span className="col-span-2 select-all text-error font-bold bg-error-container/50 px-2 py-0.5 rounded">{createdCredentials.generatedPassword}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                if (createdCredentials) {
                  const text = `Name: ${createdCredentials.displayName}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.generatedPassword}`;
                  navigator.clipboard.writeText(text);
                  toast.success('Credentials copied to clipboard');
                }
              }}
            >
              <Icon name="content_copy" size={16} className="mr-2" />
              Copy Credentials
            </Button>
            <Button className="flex-1" onClick={() => setCreatedCredentials(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
