import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { listContainer, listItem } from '@/lib/motion';
import { mockClasses, mockUsers } from '@/lib/mockData';

interface ClassForm {
  name: string;
  code: string;
  grade: string;
}

const emptyForm: ClassForm = { name: '', code: '', grade: '' };

export default function AdminClassesPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [classes, setClasses] = useState(mockClasses);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const filtered = useMemo(
    () =>
      classes.filter((c) => {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
      }),
    [classes, search]
  );

  const handleCreate = () => {
    if (!form.name || !form.code || !form.grade) {
      toast.error('Please fill in all fields');
      return;
    }
    const newClass = {
      id: `c${Date.now()}`,
      name: form.name,
      code: form.code,
      grade: form.grade,
      classTeacherId: '',
      studentCount: 0,
      subjectIds: [] as string[],
    };
    setClasses((prev) => [...prev, newClass]);
    setForm(emptyForm);
    setShowCreate(false);
    toast.success(`Class ${form.name} created`);
  };

  const handleDelete = (id: string, name: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    toast.error(`Class ${name} deleted`);
  };

  return (
    <>
      <SEOHead title="Classes" description="Manage classes" canonical="/admin/classes" />
      <DataFetchWrapper
        data={isLoading || isError ? undefined : ({})}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load classes') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Classes</h1>
                <p className="text-sm text-on-surface-variant">{classes.length} total classes</p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Icon name="add" size={18} className="mr-2" />
                Create Class
              </Button>
            </motion.div>

            <motion.div variants={listItem}>
              <div className="relative max-w-sm">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search classes..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {classes.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="class" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No classes yet</p>
                      <p className="text-sm text-on-surface-variant">Create your first class to get started.</p>
                      <Button onClick={() => setShowCreate(true)}>
                        <Icon name="add" size={18} className="mr-2" />
                        Create Class
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No classes match your search</p>
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
              <motion.div
                variants={listItem}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {filtered.map((cls) => {
                  const classTeacher = Object.values(mockUsers).find(
                    (u) => u.id === cls.classTeacherId
                  );
                  const subjectCount = cls.subjectIds.length;
                  return (
                    <Card key={cls.id} variant="elevated" className="hover:shadow-elevation-2 transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-container flex items-center justify-center">
                              <Icon name="class" size={20} className="text-on-primary-container" />
                            </div>
                            <div>
                              <CardTitle className="text-title-md">{cls.name}</CardTitle>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {cls.code}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-body-md">
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="school" size={16} />
                            <span>Grade {cls.grade}</span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="people" size={16} />
                            <span>{cls.studentCount} students</span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="badge" size={16} />
                            <span className="truncate">
                              {classTeacher ? classTeacher.displayName : 'No teacher'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="menu_book" size={16} />
                            <span>{subjectCount} subjects</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link to={`/admin/classes/${cls.id}/timetable`}>
                              <Icon name="calendar_today" size={14} className="mr-1.5" />
                              Timetable
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(`Edit ${cls.name}`)}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cls.id, cls.name)}
                          >
                            <Icon name="delete" size={16} className="text-error" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </DataFetchWrapper>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Set up a new class for the academic year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input
                placeholder="e.g. Grade 10A"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. 10A"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  placeholder="e.g. 10"
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate}>
              <Icon name="add" size={16} className="mr-2" />
              Create Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
