import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { listContainer, listItem } from '@/lib/motion';
import { mockSubjects, mockTextbooks } from '@/lib/mockData';

interface SubjectForm {
  name: string;
  code: string;
  icon: string;
  category: string;
}

const emptyForm: SubjectForm = { name: '', code: '', icon: 'menu_book', category: 'STEM' };

const categoryOptions = [
  { value: 'STEM', label: 'STEM' },
  { value: 'Humanities', label: 'Humanities' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Languages', label: 'Languages' },
  { value: 'Physical Education', label: 'Physical Education' },
];

const iconOptions = [
  { value: 'calculate', label: 'calculate' },
  { value: 'science', label: 'science' },
  { value: 'menu_book', label: 'menu_book' },
  { value: 'history', label: 'history' },
  { value: 'palette', label: 'palette' },
  { value: 'language', label: 'language' },
  { value: 'fitness_center', label: 'fitness_center' },
  { value: 'computer', label: 'computer' },
  { value: 'music_note', label: 'music_note' },
];

const categoryColors: Record<string, string> = {
  STEM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Humanities: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Arts: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Languages: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'Physical Education': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};

function SubjectsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function AdminSubjectsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const [subjects, setSubjects] = useState(mockSubjects);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const filtered = useMemo(
    () =>
      subjects.filter((s) => {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      }),
    [subjects, search]
  );

  const handleAdd = () => {
    if (!form.name || !form.code || !form.category) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newSubject = {
      id: `sub${Date.now()}`,
      name: form.name,
      code: form.code.toUpperCase(),
      icon: form.icon,
      color: '#6366f1',
      category: form.category,
    };
    setSubjects((prev) => [...prev, newSubject]);
    setForm(emptyForm);
    setShowAdd(false);
    toast.success(`Subject ${form.name} added`);
  };

  const handleDelete = (id: string, name: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    toast.error(`Subject ${name} deleted`);
  };

  const getTextbookCount = (subjectId: string) =>
    mockTextbooks.filter((tb) => tb.subjectId === subjectId).length;

  if (isLoading) return <SubjectsSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead title="Subjects" description="Manage academic subjects" canonical="/admin/subjects" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon name="error" size={32} className="text-destructive" />
            </div>
            <p className="font-medium">Failed to load subjects</p>
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
      <SEOHead title="Subjects" description="Manage academic subjects" canonical="/admin/subjects" />
      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
            <p className="text-sm text-muted-foreground">{subjects.length} total subjects</p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Icon name="add" size={18} className="mr-2" />
            Add Subject
          </Button>
        </motion.div>

        <motion.div variants={listItem}>
          <div className="relative max-w-sm">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search subjects..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div variants={listItem}>
            {subjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Icon name="menu_book" size={48} className="text-muted-foreground/50" />
                  <p className="font-medium">No subjects yet</p>
                  <p className="text-sm text-muted-foreground">Add your first subject to get started.</p>
                  <Button onClick={() => setShowAdd(true)}>
                    <Icon name="add" size={18} className="mr-2" />
                    Add Subject
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-16">
                  <Icon name="search_off" size={48} className="text-muted-foreground/50" />
                  <p className="font-medium">No subjects match your search</p>
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
          <motion.div
            variants={listItem}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((subject) => (
              <Card key={subject.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                      >
                        <Icon
                          name={subject.icon || 'menu_book'}
                          size={22}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {subject.code}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toast.success(`Edit ${subject.name}`)}
                      >
                        <Icon name="edit" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(subject.id, subject.name)}
                      >
                        <Icon name="delete" size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge className={cn('text-[10px]', categoryColors[subject.category] || '')}>
                      {subject.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getTextbookCount(subject.id)} textbook{getTextbookCount(subject.id) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </motion.div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new academic subject.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g. Computer Science"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g. CS"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <OptionsSelect
                  options={iconOptions}
                  placeholder="Select icon"
                  value={form.icon}
                  onChange={(v: string) => setForm((f) => ({ ...f, icon: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <OptionsSelect
                options={categoryOptions}
                placeholder="Select category"
                value={form.category}
                onChange={(v: string) => setForm((f) => ({ ...f, category: v }))}
              />
            </div>
            <Button className="w-full" onClick={handleAdd}>
              <Icon name="add" size={16} className="mr-2" />
              Add Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
