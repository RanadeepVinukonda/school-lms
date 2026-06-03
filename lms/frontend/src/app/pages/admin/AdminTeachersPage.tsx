import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/Icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockSubjects, mockClasses } from '@/lib/mockData';

interface TeacherForm {
  name: string;
  email: string;
  teacherId: string;
  subjectIds: string[];
}

const emptyForm: TeacherForm = { name: '', email: '', teacherId: '', subjectIds: [] };

function TeachersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-lg" />
      ))}
    </div>
  );
}

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [teachers, setTeachers] = useState(
    Object.values(mockUsers)
      .filter((u) => u.role === 'teacher')
      .map((u) => ({
        ...u,
        teacherId: u.teacherId || `TCH${u.id.slice(1).toUpperCase()}`,
        subjectIds: ['sub1', 'sub2'] as string[],
      }))
  );

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
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

  const toggleSubject = (id: string) => {
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id)
        ? f.subjectIds.filter((s) => s !== id)
        : [...f.subjectIds, id],
    }));
  };

  const handleAdd = () => {
    if (!form.name || !form.email || !form.teacherId) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newTeacher = {
      id: `t${Date.now()}`,
      email: form.email,
      displayName: form.name,
      role: 'teacher' as const,
      teacherId: form.teacherId,
      subjectIds: form.subjectIds,
      avatar: '',
    };
    setTeachers((prev) => [...prev, newTeacher]);
    setForm(emptyForm);
    setShowAdd(false);
    toast.success(`Teacher ${form.name} added successfully`);
  };

  const handleDelete = (id: string, name: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    toast.error(`Teacher ${name} removed`);
  };

  if (isLoading) return <TeachersSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead title="Teachers" description="Manage teachers" canonical="/admin/teachers" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon name="error" size={32} className="text-destructive" />
            </div>
            <p className="font-medium">Failed to load teachers</p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={16} className="mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Teachers" description="Manage teachers" canonical="/admin/teachers" />
      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
            <p className="text-sm text-muted-foreground">{teachers.length} total teachers</p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Icon name="add" size={18} className="mr-2" />
            Add Teacher
          </Button>
        </motion.div>

        <motion.div variants={listItem}>
          <div className="relative max-w-sm">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
                  <Icon name="badge" size={48} className="text-muted-foreground/50" />
                  <p className="font-medium">No teachers yet</p>
                  <p className="text-sm text-muted-foreground">Add your first teacher to get started.</p>
                  <Button onClick={() => setShowAdd(true)}>
                    <Icon name="add" size={18} className="mr-2" />
                    Add Teacher
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Icon name="search_off" size={48} className="text-muted-foreground/50" />
                  <p className="font-medium">No teachers match your search</p>
                  <p className="text-sm text-muted-foreground">Try a different search term.</p>
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
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Teacher ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Subjects</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Class Teacher</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((teacher) => {
                    const subjectNames = teacher.subjectIds
                      .map((sid) => mockSubjects.find((s) => s.id === sid)?.name)
                      .filter(Boolean);
                    const classTeacherOf = mockClasses.find((c) => c.classTeacherId === teacher.id);
                    return (
                      <tr key={teacher.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">{teacher.displayName}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{teacher.email}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{teacher.teacherId}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {subjectNames.length > 0
                              ? subjectNames.map((sn) => (
                                  <Badge key={sn} variant="secondary" className="text-[10px]">
                                    {sn}
                                  </Badge>
                                ))
                              : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {classTeacherOf ? (
                            <Badge variant="info" className="text-[10px]">{classTeacherOf.name}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => toast.success('Edit teacher')}>
                              <Icon name="edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(teacher.id, teacher.displayName)}
                            >
                              <Icon name="delete" size={16} className="text-destructive" />
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
              <Label>Teacher ID</Label>
              <Input
                placeholder="e.g. TCH003"
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Subjects</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                {mockSubjects.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
                  >
                    <Checkbox
                      checked={form.subjectIds.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                    />
                    <Icon name={subject.icon || 'menu_book'} size={16} />
                    <span>{subject.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleAdd}>
              <Icon name="person_add" size={16} className="mr-2" />
              Add Teacher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
