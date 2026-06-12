import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { OptionsSelect } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getUserByRole, getAllClasses } from '@/services/dataService';
import { userService } from '@/services/userService';
import type { ClassEntry } from '@/services/dataService';

export default function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    displayName: '',
    rollNo: '',
    classId: '',
    academicYear: new Date().getFullYear().toString(),
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    studentId: string;
    email: string;
    generatedPassword?: string;
    displayName: string;
  } | null>(null);

  const { data: students = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => getUserByRole('student'),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes-options'],
    queryFn: getAllClasses,
  });

  const classOptions = classes.map((c: ClassEntry) => ({ value: c.id, label: c.name }));

  const createMutation = useMutation({
    mutationFn: () =>
      userService.create({
        displayName: createForm.displayName,
        role: 'student',
        classId: createForm.classId,
        rollNo: createForm.rollNo ? parseInt(createForm.rollNo, 10) : undefined,
        academicYear: createForm.academicYear,
      }),
    onSuccess: (res: any) => {
      const studentData = res.data;
      setCreatedCredentials({
        studentId: studentData.studentId,
        email: studentData.email,
        generatedPassword: studentData.generatedPassword,
        displayName: studentData.displayName,
      });
      setShowCreate(false);
      setCreateForm({
        displayName: '',
        rollNo: '',
        classId: '',
        academicYear: new Date().getFullYear().toString(),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create student');
    },
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: '',
    rollNo: '',
    classId: '',
    academicYear: '',
  });

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const editMutation = useMutation({
    mutationFn: () =>
      userService.update(editTarget.id, {
        displayName: editForm.displayName,
        classId: editForm.classId,
        rollNo: editForm.rollNo ? parseInt(editForm.rollNo, 10) : undefined,
        academicYear: editForm.academicYear,
      }),
    onSuccess: () => {
      toast.success('Student updated successfully');
      setShowEdit(false);
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update student');
    },
  });

  const handleEditClick = (student: any) => {
    setEditTarget(student);
    setEditForm({
      displayName: student.displayName || '',
      rollNo: student.rollNo ? String(student.rollNo) : '',
      classId: student.classId || '',
      academicYear: student.academicYear || '',
    });
    setShowEdit(true);
  };

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const nameMatch = s.displayName.toLowerCase().includes(search.toLowerCase());
        const emailMatch = s.email.toLowerCase().includes(search.toLowerCase());
        const classMatch = classFilter === 'all' || s.classId === classFilter;
        return (nameMatch || emailMatch) && classMatch;
      }),
    [students, search, classFilter]
  );

  const paginatedStudents = useMemo(() => {
    const startIdx = (page - 1) * itemsPerPage;
    return filtered.slice(startIdx, startIdx + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // Reset page when search or classFilter changes
  useEffect(() => {
    setPage(1);
  }, [search, classFilter]);

  return (
    <>
      <SEOHead title="Students" description="Manage students" canonical="/admin/students" />
      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : isError ? (
        <ErrorState title="Failed to load students" message="Could not fetch student data" onRetry={() => refetch()} />
      ) : (
        <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Students</h1>
                <p className="text-sm text-on-surface-variant">{students.length} total students</p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="add" size={16} className="mr-2" />
                Add Student
              </Button>
            </motion.div>

            <motion.div variants={listItem} className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search students..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <OptionsSelect
                options={[{ value: 'all', label: 'All Classes' }, ...classOptions]}
                value={classFilter}
                onChange={(v: string) => setClassFilter(v)}
                className="w-40"
              />
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => { setSearch(''); setClassFilter('all'); }}
              >
                Clear
              </button>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {students.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="person_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No students yet</p>
                      <p className="text-sm text-on-surface-variant">Students will appear here once they register.</p>
                      <Button onClick={() => setShowCreate(true)}>
                        <Icon name="add" size={16} className="mr-2" />
                        Create Student
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No students match your search</p>
                      <p className="text-sm text-on-surface-variant">Try adjusting your search or filter.</p>
                      <button className="text-sm text-primary hover:underline" onClick={() => { setSearch(''); setClassFilter('all'); }}>
                        Clear Filters
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
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Student ID</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Class</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="text-right text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-outline-variant divide-y">
                      {paginatedStudents.map((student) => {
                        const className = classes.find((c: ClassEntry) => c.id === student.classId)?.name || '\u2014';
                        return (
                          <tr key={student.id} className="hover:bg-surface-variant/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-body-md font-medium">{student.displayName}</span>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant">{student.email}</td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{student.studentId || '\u2014'}</td>
                            <td className="px-4 py-3 text-body-md">{className}</td>
                            <td className="px-4 py-3">
                              <Badge variant={student.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                                {student.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleEditClick(student)}
                                title="Edit Student"
                              >
                                <Icon name="edit" size={16} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

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
                        className="h-8 w-8 text-xs font-semibold"
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
            )}
          </motion.div>
        </motion.div>
      )}

      {/* CREATE STUDENT DIALOG */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Student</DialogTitle>
            <DialogDescription>Create a new student account. Unique Student ID and login credentials will be generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <OptionsSelect
                  options={classOptions}
                  placeholder="Select Class"
                  value={createForm.classId}
                  onChange={(v: string) => setCreateForm((f) => ({ ...f, classId: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={createForm.rollNo}
                  onChange={(e) => setCreateForm((f) => ({ ...f, rollNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                placeholder="e.g. 2026"
                value={createForm.academicYear}
                onChange={(e) => setCreateForm((f) => ({ ...f, academicYear: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!createForm.displayName || !createForm.classId || !createForm.rollNo || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />Registering...</>
              ) : (
                <><Icon name="add" size={16} className="mr-2" />Register Student</>
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
              Student Credentials Generated
            </DialogTitle>
            <DialogDescription>
              Please copy these credentials and share them with the student. This is the only time the password is shown.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 bg-surface-variant/40 p-4 rounded-lg border border-outline-variant font-mono text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-outline-variant/60 pb-2">
                <span className="font-bold text-on-surface-variant">Name:</span>
                <span className="col-span-2 select-all font-sans font-medium">{createdCredentials.displayName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-outline-variant/60 pb-2">
                <span className="font-bold text-on-surface-variant">Student ID:</span>
                <span className="col-span-2 select-all text-primary font-bold">{createdCredentials.studentId}</span>
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
                  const text = `Name: ${createdCredentials.displayName}\nStudent ID: ${createdCredentials.studentId}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.generatedPassword}`;
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

      {/* EDIT STUDENT DIALOG */}
      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
            <DialogDescription>Update the student's name, class mapping, or roll number.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <OptionsSelect
                  options={classOptions}
                  placeholder="Select Class"
                  value={editForm.classId}
                  onChange={(v: string) => setEditForm((f) => ({ ...f, classId: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={editForm.rollNo}
                  onChange={(e) => setEditForm((f) => ({ ...f, rollNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Input
                placeholder="e.g. 2026"
                value={editForm.academicYear}
                onChange={(e) => setEditForm((f) => ({ ...f, academicYear: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEdit(false); setEditTarget(null); }}>Cancel</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!editForm.displayName || !editForm.classId || !editForm.rollNo || editMutation.isPending}
            >
              {editMutation.isPending ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />Saving...</>
              ) : (
                <><Icon name="save" size={16} className="mr-2" />Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
