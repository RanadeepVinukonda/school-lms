import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import { ROUTES } from '@/lib/constants';

interface HierarchyNode {
  id: string;
  label: string;
}

export function TeacherHierarchyNav() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [textbookId, setTextbookId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [conceptId, setConceptId] = useState('');

  const { data: myAssignments } = useQuery({
    queryKey: ['teacher-my-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data as any[]),
    enabled: !!user?.id,
  });

  const { data: classes = [] } = useClasses();
  const classList: HierarchyNode[] = classes
    ? [...new Map(classes.map((c: any) => [c.id, { id: c.id, label: formatClassName(c) }])).values()]
    : [];

  const subjectsForClass: HierarchyNode[] = myAssignments
    ?.filter((a: any) => a.classId === classId)
    .map((a: any) => ({ id: a.subjectId, label: a.subjectName || a.subjectId })) ?? [];
  const uniqueSubjects = [...new Map(subjectsForClass.map((s) => [s.id, s])).values()];

  const { data: textbooks } = useQuery({
    queryKey: ['textbooks-by-subject', subjectId],
    queryFn: () => subjectId ? api.get(`/textbooks/by-class/${classId}/subject/${subjectId}`).then((r) => r.data.data) : Promise.resolve([]),
    enabled: !!subjectId && !!classId,
  });
  const textbookList: HierarchyNode[] = (textbooks ?? []).map((t: any) => ({ id: t.id, label: t.title }));

  const { data: chapters } = useQuery({
    queryKey: ['chapters-by-textbook', textbookId],
    queryFn: () => textbookId ? api.get(`/textbooks/${textbookId}/chapters`).then((r) => r.data.data) : Promise.resolve([]),
    enabled: !!textbookId,
  });
  const chapterList: HierarchyNode[] = (chapters ?? []).map((ch: any) => ({ id: ch.id, label: `Chapter ${ch.order}: ${ch.title}` }));

  const { data: concepts } = useQuery({
    queryKey: ['concepts-by-chapter', textbookId, chapterId],
    queryFn: () => (textbookId && chapterId) ? api.get(`/textbooks/${textbookId}/chapters/${chapterId}/concepts`).then((r) => r.data.data) : Promise.resolve([]),
    enabled: !!textbookId && !!chapterId,
  });
  const conceptList: HierarchyNode[] = (concepts ?? []).map((c: any) => ({ id: c.id, label: c.title }));

  useEffect(() => { setSubjectId(''); setTextbookId(''); setChapterId(''); setConceptId(''); }, [classId]);
  useEffect(() => { setTextbookId(''); setChapterId(''); setConceptId(''); }, [subjectId]);
  useEffect(() => { setChapterId(''); setConceptId(''); }, [textbookId]);
  useEffect(() => { setConceptId(''); }, [chapterId]);

  useEffect(() => {
    if (conceptId && textbookId && chapterId) {
      navigate(ROUTES.TEACHER_CONCEPT(textbookId, chapterId, conceptId));
    }
  }, [conceptId, textbookId, chapterId, navigate]);

  const Selector = ({ label, value, options, onChange, disabled }: {
    label: string; value: string; options: HierarchyNode[];
    onChange: (v: string) => void; disabled?: boolean;
  }) => (
    <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed truncate w-full sm:w-auto sm:max-w-[200px]"
      >
        <option value="">Select {label}...</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
      <Selector label="Class" value={classId} options={classList} onChange={setClassId} />
      {classId && <Icon name="chevron_right" size={16} className="text-muted-foreground -mx-1 hidden sm:block" />}
      {classId && <Selector label="Subject" value={subjectId} options={uniqueSubjects} onChange={setSubjectId} disabled={!classId} />}
      {subjectId && <Icon name="chevron_right" size={16} className="text-muted-foreground -mx-1 hidden sm:block" />}
      {subjectId && <Selector label="Textbook" value={textbookId} options={textbookList} onChange={setTextbookId} disabled={!subjectId} />}
      {textbookId && <Icon name="chevron_right" size={16} className="text-muted-foreground -mx-1 hidden sm:block" />}
      {textbookId && <Selector label="Chapter" value={chapterId} options={chapterList} onChange={setChapterId} disabled={!textbookId} />}
      {chapterId && <Icon name="chevron_right" size={16} className="text-muted-foreground -mx-1 hidden sm:block" />}
      {chapterId && <Selector label="Concept" value={conceptId} options={conceptList} onChange={setConceptId} disabled={!chapterId} />}
    </div>
  );
}
