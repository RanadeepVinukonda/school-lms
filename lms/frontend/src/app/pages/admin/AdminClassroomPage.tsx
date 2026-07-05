import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { classroomService, ClassroomCourse } from '@/services/classroomService';
import api from '@/services/api';

export default function AdminClassroomPage() {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('google_classroom_token') || '');
  const [isTokenSaved, setIsTokenSaved] = useState(!!accessToken);
  const [selectedLmsClass, setSelectedLmsClass] = useState('');

  // Save Token
  const saveToken = () => {
    if (!accessToken.trim()) {
      toast.error('Token cannot be empty');
      return;
    }
    localStorage.setItem('google_classroom_token', accessToken);
    setIsTokenSaved(true);
    toast.success('Google Access Token saved locally');
  };

  const clearToken = () => {
    localStorage.removeItem('google_classroom_token');
    setAccessToken('');
    setIsTokenSaved(false);
    toast.success('Token removed');
  };

  // Fetch LMS Classes
  const { data: classesData = [] } = useQuery({
    queryKey: ['classroom-lms-classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    }
  });

  // Fetch Google Classroom Courses
  const { data: coursesRes, isLoading: loadingCourses, refetch: fetchCourses } = useQuery({
    queryKey: ['classroom-courses', accessToken],
    queryFn: () => classroomService.getCourses(accessToken),
    enabled: isTokenSaved && !!accessToken,
  });

  const courses = coursesRes?.data || [];

  // Mutation: Sync Roster
  const syncMutation = useMutation({
    mutationFn: (data: { classroomCourseId: string; targetClassId: string }) =>
      classroomService.syncRoster({
        classroomCourseId: data.classroomCourseId,
        targetClassId: data.targetClassId,
        accessToken
      }),
    onSuccess: (res) => {
      toast.success(`Roster synchronized successfully! Synced ${res.data?.count || 0} students.`);
    },
    onError: (err: any) => toast.error(err?.message || 'Roster synchronization failed'),
  });

  return (
    <>
      <SEOHead title="Google Classroom Integration" description="Link and sync rosters with Google Classroom" />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Google Classroom</h1>
          <p className="text-body-md text-muted-foreground mt-1">Connect your school's Google Classroom courses and sync student rosters</p>
        </motion.div>

        {/* Token Configuration */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-title-sm">API Authentication</CardTitle>
            <CardDescription>Configure Google OAuth Access Token with Classroom Scopes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isTokenSaved ? (
              <div className="flex gap-2 max-w-xl">
                <Input
                  type="password"
                  placeholder="Enter Google Access Token..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={saveToken}>Connect Account</Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-success-container/20 border border-success-container/30 p-4 rounded-xl max-w-xl">
                <Icon name="check_circle" className="text-success shrink-0" size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-title-sm font-semibold text-foreground">Google Classroom Connected</p>
                  <p className="text-xs text-muted-foreground truncate">Token: ••••••••••••••••••••••••</p>
                </div>
                <Button variant="outline" size="sm" onClick={clearToken}>Disconnect</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Courses & Syncing */}
        {isTokenSaved && (
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm">Courses Directory</CardTitle>
              <CardDescription>Select a Classroom course and link it to an LMS class to trigger sync</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <label className="text-label-sm text-muted-foreground mb-1 block">LMS Target Class Hub *</label>
                  <OptionsSelect
                    options={classesData.map((c: any) => ({ value: c.id, label: c.name }))}
                    value={selectedLmsClass}
                    onValueChange={setSelectedLmsClass}
                    className="w-full"
                  />
                </div>
              </div>

              {loadingCourses ? (
                <div className="text-center py-8 text-muted-foreground">Loading Classroom courses...</div>
              ) : (
                <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-3">Classroom Course</th>
                        <th className="px-6 py-3">Section</th>
                        <th className="px-6 py-3 text-right">Synchronization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-title-sm">
                      {courses.map((course: ClassroomCourse) => (
                        <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold">{course.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{course.section || '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              disabled={!selectedLmsClass}
                              onClick={() => syncMutation.mutate({ classroomCourseId: course.id, targetClassId: selectedLmsClass })}
                              loading={syncMutation.isPending && syncMutation.variables?.classroomCourseId === course.id}
                            >
                              <Icon name="sync" size={14} className="mr-1" />
                              Sync Roster
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
