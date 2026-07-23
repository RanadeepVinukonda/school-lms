import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

type TabType = 'quizzes' | 'assignments' | 'exams';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'quizzes', label: 'Quizzes', icon: 'quiz' },
  { key: 'assignments', label: 'Assignments', icon: 'assignment' },
  { key: 'exams', label: 'Exams', icon: 'fact_check' },
];

function formatDate(d: string) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export default function TeacherQuizzesTasksPage() {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabType>('quizzes');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });
  const assignmentList: TeacherAssignment[] = assignments ?? [];

  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, string>();
    assignmentList.forEach(a => { if (!map.has(a.subjectId)) map.set(a.subjectId, a.subjectName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignmentList]);

  const { data: quizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['teacher-all-quizzes'],
    queryFn: () => api.get('/quizzes-v2/my').then((r) => r.data.data),
    enabled: activeTab === 'quizzes' && !!user?.id,
  });

  const { data: allAssignments, isLoading: allAssignmentsLoading } = useQuery({
    queryKey: ['teacher-all-assignments'],
    queryFn: () => api.get('/assignments-v2/my').then((r) => r.data.data),
    enabled: activeTab === 'assignments' && !!user?.id,
  });

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['teacher-all-exams'],
    queryFn: () => api.get('/exams-v2/my').then((r) => r.data.data),
    enabled: activeTab === 'exams' && !!user?.id,
  });

  const getItems = () => {
    let items: any[] = [];
    if (activeTab === 'quizzes') items = quizzes ?? [];
    else if (activeTab === 'assignments') items = allAssignments ?? [];
    else items = exams ?? [];
    return items;
  };

  const filteredItems = useMemo(() => {
    let items = getItems();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i: any) => (i.title || '').toLowerCase().includes(q));
    }
    if (activeTab === 'exams' && subjectFilter) {
      items = items.filter((i: any) => i.subjectId === subjectFilter || i.subject_id === subjectFilter);
    }
    return items;
  }, [activeTab, searchQuery, subjectFilter, quizzes, allAssignments, exams]);

  const getStatusBadge = (item: any) => {
    const released = !!item.releasedAt;
    const republished = !!item.isRepublished;
    if (republished) return { label: _('Republished'), variant: 'success' as const };
    if (released) return { label: _('Released'), variant: 'success' as const };
    return { label: _('Draft'), variant: 'secondary' as const };
  };

  const getCreateRoute = () => {
    if (activeTab === 'exams') return ROUTES.TEACHER_EXAM_CREATE;
    return ROUTES.TEACHER_ASSESSMENTS + '?type=' + activeTab;
  };

  const isLoading =
    (activeTab === 'quizzes' && quizzesLoading) ||
    (activeTab === 'assignments' && allAssignmentsLoading) ||
    (activeTab === 'exams' && examsLoading);

  return (
    <>
      <SEOHead title={_('Quizzes & Tasks')} description={_('Manage quizzes, assignments, and exams')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-6 pb-32"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-headline-md font-bold">{_('Quizzes & Tasks')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Create and manage all assessments')}</p>
          </div>
          <Button onClick={() => navigate(getCreateRoute())} className="gap-2">
            <Icon name="add" size={18} />
            {_('Create')}
          </Button>
        </div>

        <div className="border-b border-border/60">
          <div className="flex gap-0 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {_(tab.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={_('Search by title...')}
              className="pl-10"
            />
          </div>
          {activeTab === 'exams' && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{_('All Subjects')}</option>
              {uniqueSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <DataFetchWrapper
          data={filteredItems}
          isLoading={isLoading}
          error={null}
          loadingType="list"
          emptyMessage={_('No items found')}
          emptyIcon={<Icon name={TABS.find(t => t.key === activeTab)?.icon || 'quiz'} size={40} className="text-muted-foreground/50" />}
        >
          {() => (
            <div className="space-y-3">
              {filteredItems.map((item: any) => {
                const status = getStatusBadge(item);
                return (
                  <Card key={item.id} className="border-border/60 hover:border-primary/20 transition-colors cursor-pointer" onClick={() => {
                    if (activeTab === 'exams') navigate(`/teacher/exams/${item.id}/correct`);
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${status.variant === 'success' ? 'bg-success-container' : 'bg-secondary-container'}`}>
                          <Icon name={TABS.find(t => t.key === activeTab)?.icon || 'quiz'} size={20}
                            className={status.variant === 'success' ? 'text-on-success-container' : 'text-on-secondary-container'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold truncate">{item.title}</p>
                            <Badge variant={status.variant} className="text-[10px] shrink-0 capitalize">{status.label}</Badge>
                          </div>
                          <p className="text-label-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground flex-wrap">
                            {item.timeLimitMinutes && (
                              <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{item.timeLimitMinutes} {_('min')}</span>
                            )}
                            {item.passingScore && (
                              <span className="flex items-center gap-1"><Icon name="percent" size={14} />{_('Pass')}: {item.passingScore}%</span>
                            )}
                            {item.attemptCount !== undefined && (
                              <span className="flex items-center gap-1"><Icon name="people" size={14} />{item.attemptCount} {_('attempts')}</span>
                            )}
                            {item.questionCount && (
                              <span className="flex items-center gap-1"><Icon name="quiz" size={14} />{item.questionCount} {_('questions')}</span>
                            )}
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
                          <Icon name="chevron_right" size={18} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
