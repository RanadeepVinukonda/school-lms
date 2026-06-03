import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Edit, Trash2, GripVertical, FileText,
  Video, GraduationCap, Users, Settings, AlertCircle, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

function ManageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function CourseManagePage() {
  const { courseId } = useParams();
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['course-manage', courseId],
    queryFn: async () => { await new Promise(r => setTimeout(r, 500)); return null; },
  });

  if (isLoading) return <ManageSkeleton />;

  const modules = [
    { id: 'm1', title: 'Linear Equations', lessons: [
      { id: 'l1', title: 'Introduction to Linear Eq.', type: 'video', duration: '15m' },
      { id: 'l2', title: 'Solving Equations', type: 'document', duration: '20m' },
    ]},
    { id: 'm2', title: 'Quadratic Functions', lessons: [
      { id: 'l3', title: 'Graphing Parabolas', type: 'video', duration: '25m' },
    ]},
  ];

  const students = [
    { id: 's1', name: 'Alex M.', email: 'alex@school.edu', grade: 'A-', lastActive: '2h ago' },
    { id: 's2', name: 'Sarah K.', email: 'sarah@school.edu', grade: 'B+', lastActive: '1d ago' },
    { id: 's3', name: 'James W.', email: 'james@school.edu', grade: 'C+', lastActive: '3d ago' },
  ];

  const lessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-primary" />;
      case 'document': return <FileText className="h-4 w-4 text-amber-500" />;
      default: return <GraduationCap className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <>
      <SEOHead title="Manage Course" description="Course management settings" canonical="/teacher/courses" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/teacher/courses"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>
      <h1 className="text-xl font-bold mb-4">Algebra II</h1>

      <Tabs defaultValue="content">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-3 mt-3">
          {modules.map(mod => (
            <Card key={mod.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <CardTitle className="text-sm">{mod.title}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {mod.lessons.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    {lessonIcon(l.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{l.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{l.duration}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-1 text-muted-foreground">
                  <Plus className="h-4 w-4 mr-1" />Add Lesson
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="w-full"><Plus className="h-4 w-4 mr-2" />Add Module</Button>
        </TabsContent>

        <TabsContent value="assignments" className="mt-3 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">3 assignments</p>
            <Button size="sm" asChild><Link to={`/teacher/courses/${courseId}/assignments/create`}><Plus className="h-4 w-4 mr-1" />Create</Link></Button>
          </div>
          {[
            { id: 'a1', title: 'Homework Set 5', status: 'published', due: '2026-06-10', submissions: 28 },
            { id: 'a2', title: 'Midterm Review', status: 'draft', due: '2026-06-15', submissions: 0 },
          ].map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.title}</p>
                    <Badge variant={a.status === 'published' ? 'success' : 'secondary'}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Due {a.due} &middot; {a.submissions} submissions</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="students" className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />{students.length} enrolled
          </div>
          {students.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{s.lastActive}</span>
                  <Badge variant={s.grade.startsWith('A') ? 'success' : s.grade.startsWith('B') ? 'secondary' : 'warning'}>{s.grade}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Course Title</Label>
                <Input defaultValue="Algebra II" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} defaultValue="Advanced algebra course covering linear equations..." />
              </div>
              <div className="flex items-center justify-between">
                <Label>Published</Label>
                <Switch defaultChecked />
              </div>
              <Button className="w-full">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
