import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Edit, Trash2, AlertCircle, Save, X, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  color: string;
  courses: number;
}

const subjects: Subject[] = [
  { id: 's1', name: 'Mathematics', code: 'MATH', description: 'Study of numbers, quantities, and shapes', color: 'bg-blue-500', courses: 3 },
  { id: 's2', name: 'Science', code: 'SCI', description: 'Study of the natural world', color: 'bg-emerald-500', courses: 2 },
  { id: 's3', name: 'History', code: 'HIST', description: 'Study of past events', color: 'bg-amber-500', courses: 2 },
  { id: 's4', name: 'English', code: 'ENG', description: 'Study of language and literature', color: 'bg-rose-500', courses: 1 },
  { id: 's5', name: 'Art', code: 'ART', description: 'Creative expression through various media', color: 'bg-violet-500', courses: 1 },
];

export default function SubjectManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 400)); return null; },
  });

  if (isLoading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load subjects</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No subjects yet</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Subject Management" description="Manage academic subjects" canonical="/admin/subjects" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Subjects</h1>
          <p className="text-sm text-muted-foreground">{subjects.length} subjects</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {subjects.map(s => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', s.color)}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    {editingId === s.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 w-36" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { toast.success('Updated'); setEditingId(null); }}>
                          <Save className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{s.name}</p>
                        <Badge variant="outline" className="text-[10px]">{s.code}</Badge>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.courses} courses</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(s.id); setEditName(s.name); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.error('Subject deleted')}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new subject</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input placeholder="e.g. Physics" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="e.g. PHYS" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Brief description" rows={2} />
            </div>
            <Button className="w-full" onClick={() => { toast.success('Subject added'); setShowCreate(false); }}>Add Subject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
