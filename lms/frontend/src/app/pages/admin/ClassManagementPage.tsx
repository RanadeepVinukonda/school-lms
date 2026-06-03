import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutGrid, Plus, Edit, Trash2, Users, AlertCircle,
  Search, X, Loader2, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { OptionsSelect } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn, getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

interface ClassItem {
  id: string;
  name: string;
  section: string;
  subject: string;
  teacher: string;
  students: number;
}

const classes: ClassItem[] = [
  { id: 'c1', name: 'Algebra II - A', section: 'A', subject: 'Math', teacher: 'Mrs. Johnson', students: 32 },
  { id: 'c2', name: 'World History - B', section: 'B', subject: 'History', teacher: 'Mr. Chen', students: 28 },
  { id: 'c3', name: 'Biology 101 - A', section: 'A', subject: 'Science', teacher: 'Dr. Patel', students: 35 },
];

export default function ClassManagementPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 500)); return null; },
  });

  if (isLoading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load classes</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No classes created yet</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Class</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (showDetail) {
    const cls = classes.find(c => c.id === showDetail);
    if (!cls) return null;
    return (
      <div className="p-4 max-w-3xl mx-auto pb-20">
        <Button variant="ghost" size="sm" onClick={() => setShowDetail(null)} className="mb-3">
          <X className="h-4 w-4 mr-1" />Back
        </Button>
        <h2 className="text-lg font-bold mb-1">{cls.name}</h2>
        <p className="text-sm text-muted-foreground mb-4">{cls.subject} &middot; Section {cls.section} &middot; {cls.teacher}</p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">{cls.students} Students</p>
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Add Student</Button>
        </div>

        {[
          { name: 'Alex M.', email: 'alex@school.edu' },
          { name: 'Sarah K.', email: 'sarah@school.edu' },
          { name: 'James W.', email: 'james@school.edu' },
        ].map(s => (
          <Card key={s.name} className="mb-2">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback></Avatar>
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SEOHead title="Class Management" description="Manage school classes" canonical="/admin/classes" />
      <div className="p-4 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Class Management</h1>
          <p className="text-sm text-muted-foreground">{classes.length} classes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Class</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search classes..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowDetail(c.id)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subject} &middot; Section {c.section} &middot; <Users className="h-3 w-3 inline" /> {c.students} students</p>
                  <p className="text-xs text-muted-foreground">Teacher: {c.teacher}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); toast.success('Edit class'); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); toast.error('Class deleted'); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Class</DialogTitle>
            <DialogDescription>Set up a new class</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input placeholder="e.g. Algebra II - A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <OptionsSelect options={[{ value: 'math', label: 'Math' }, { value: 'science', label: 'Science' }, { value: 'history', label: 'History' }]} placeholder="Select" />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <OptionsSelect options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }]} placeholder="Select" />
              </div>
            </div>
            <Button className="w-full" onClick={() => { toast.success('Class created'); setShowCreate(false); }}>Create Class</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
