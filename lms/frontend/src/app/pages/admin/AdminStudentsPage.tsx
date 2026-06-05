import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getUserByRole, getAllClasses } from '@/services/dataService';
import type { ClassEntry, UserDoc } from '@/services/dataService';

interface StudentForm {
  name: string;
  email: string;
  studentId: string;
  classId: string;
}

interface StudentDisplay extends UserDoc {
  studentId: string;
  classId: string;
}

const emptyForm: StudentForm = { name: '', email: '', studentId: '', classId: '' };

export default function AdminStudentsPage() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [students, setStudents] = useState<StudentDisplay[]>([]);

  const { data: fetchedStudents, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => getUserByRole('student'),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes-options'],
    queryFn: getAllClasses,
  });

  useEffect(() => {
    if (fetchedStudents) {
      setStudents(
        fetchedStudents.map((u) => ({
          ...u,
          studentId: u.studentId || `STU${u.id.slice(0, 4).toUpperCase()}`,
          classId: u.classId || '',
        }))
      );
    }
  }, [fetchedStudents]);

  const classOptions = classes.map((c: ClassEntry) => ({ value: c.id, label: c.name }));

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

  const handleAdd = () => {
    if (!form.name || !form.email || !form.studentId || !form.classId) {
      toast.error('Please fill in all fields');
      return;
    }
    const newStudent: StudentDisplay = {
      id: `s${Date.now()}`,
      email: form.email,
      displayName: form.name,
      role: 'student',
      studentId: form.studentId,
      classId: form.classId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    setForm(emptyForm);
    setShowAdd(false);
    toast.success(`Student ${form.name} added successfully`);
  };

  const handleDelete = (id: string, name: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.error(`Student ${name} removed`);
  };

  return (
    <>
      <SEOHead title="Students" description="Manage students" canonical="/admin/students" />
      <DataFetchWrapper
        data={students}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load students') : null}
        onRetry={() => refetch()}
        loadingType="table"
      >
        {() => (
          <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
            <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Students</h1>
                <p className="text-sm text-on-surface-variant">{students.length} total students</p>
              </div>
              <Button onClick={() => setShowAdd(true)}>
                <Icon name="add" size={18} className="mr-2" />
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
              <Button variant="outline" size="icon" onClick={() => { setSearch(''); setClassFilter('all'); }} title="Clear filters">
                <Icon name="filter_list" size={18} />
              </Button>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {students.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="person_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No students yet</p>
                      <p className="text-sm text-on-surface-variant">Add your first student to get started.</p>
                      <Button onClick={() => setShowAdd(true)}>
                        <Icon name="add" size={18} className="mr-2" />
                        Add Student
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No students match your search</p>
                      <p className="text-sm text-on-surface-variant">Try adjusting your search or filter.</p>
                      <Button variant="outline" onClick={() => { setSearch(''); setClassFilter('all'); }}>
                        <Icon name="close" size={16} className="mr-2" />
                        Clear Filters
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
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Student ID</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Class</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="text-right text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-outline-variant divide-y">
                      {filtered.map((student) => {
                        const className = classes.find((c: ClassEntry) => c.id === student.classId)?.name || '\u2014';
                        return (
                          <tr key={student.id} className="hover:bg-surface-variant/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-body-md font-medium">{student.displayName}</span>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant">{student.email}</td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{student.studentId}</td>
                            <td className="px-4 py-3 text-body-md">{className}</td>
                            <td className="px-4 py-3">
                              <Badge variant="success" className="text-[10px]">Active</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Edit student')}>
                                  <Icon name="edit" size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDelete(student.id, student.displayName)}
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
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Enter the student details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@school.edu"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Student ID</Label>
              <Input
                placeholder="e.g. STU004"
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <OptionsSelect
                options={classOptions}
                placeholder="Select class"
                value={form.classId}
                onChange={(v: string) => setForm((f) => ({ ...f, classId: v }))}
              />
            </div>
            <Button className="w-full" onClick={handleAdd}>
              <Icon name="person_add" size={16} className="mr-2" />
              Add Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
