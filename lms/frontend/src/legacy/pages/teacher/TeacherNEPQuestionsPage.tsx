import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NEPQuestionGenerator } from '@/components/nep-questions/NEPQuestionGenerator';
import { RubricGenerator } from '@/components/nep-questions/RubricGenerator';
import { FeedbackViewer } from '@/components/nep-questions/FeedbackViewer';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export default function TeacherNEPQuestionsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('generate');
  const { data: textbooksData } = useQuery({
    queryKey: ['textbooks', user?.id],
    queryFn: () => api.get('/textbooks', { params: { createdBy: user?.id } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/assignments-v2').then((r) => r.data.data),
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api.get('/assignments-v2', { params: { includeSubmissions: true } }).then((r) => r.data.data),
  });

  const concepts: { id: string; name: string; subject: string }[] = [];
  textbooksData?.forEach((tb: any) => {
    tb.chapters?.forEach((ch: any) => {
      ch.concepts?.forEach((c: any) => {
        concepts.push({ id: c.id, name: c.title || c.name, subject: tb.subject || tb.name });
      });
    });
  });

  const assignments = (assignmentsData?.items || assignmentsData || []).map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    totalMarks: a.totalMarks || a.points || 20,
  }));

  const submissions = (submissionsData?.items || submissionsData || [])
    .filter((s: any) => s.submissionText || s.answer)
    .map((s: any) => ({
      id: s.id,
      studentName: s.studentName || s.studentId || 'Unknown',
      answer: s.submissionText || s.answer || '',
    }));

  return (
    <>
      <SEOHead title={_('NEP Question Generator')} description={_('Generate NEP-aligned Olympiad, Competency, and Viva questions')} canonical="/teacher/nep-questions" />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">{_('NEP Question Generator')}</h1>
            <p className="text-body-md text-muted-foreground">{_('Olympiad, Competency-Based & Viva questions with AI rubrics and feedback')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="generate">{_('Generate Questions')}</TabsTrigger>
            <TabsTrigger value="rubric">{_('Rubric Generator')}</TabsTrigger>
            <TabsTrigger value="feedback">{_('Feedback')}</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            <DataFetchWrapper data={textbooksData} isLoading={false} error={null}>
              {() => (
                <NEPQuestionGenerator concepts={concepts} />
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="rubric" className="mt-6">
            <DataFetchWrapper data={assignmentsData} isLoading={false} error={null}>
              {() => (
                <RubricGenerator assignments={assignments} />
              )}
            </DataFetchWrapper>
          </TabsContent>

          <TabsContent value="feedback" className="mt-6">
            <DataFetchWrapper data={submissionsData} isLoading={false} error={null}>
              {() => (
                <FeedbackViewer submissions={submissions} />
              )}
            </DataFetchWrapper>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
