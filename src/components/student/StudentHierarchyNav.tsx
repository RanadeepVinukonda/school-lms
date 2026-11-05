import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getClass, getSubject } from '@/services/dataService';
import { getTextbooksBySubject, getChaptersForTextbook } from '@/services/textbookService';
import type { Subject } from '@/services/dataService';

export function StudentHierarchyNav() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [subjectId, setSubjectId] = useState('');
  const [textbookId, setTextbookId] = useState('');
  const [chapterId, setChapterId] = useState('');

  const { data: enrolledSubjects } = useQuery({
    queryKey: ['student-enrolled-subjects', user?.classId],
    queryFn: async () => {
      if (!user?.classId) return [];
      const classDoc = await getClass(user.classId);
      if (!classDoc || !classDoc.subjectIds || classDoc.subjectIds.length === 0) return [];
      const results = await Promise.all(
        classDoc.subjectIds.map((id) => getSubject(id)),
      );
      return results.filter(Boolean) as Subject[];
    },
    enabled: !!user?.classId,
  });

  const uniqueSubjects: { id: string; label: string }[] = enrolledSubjects
    ? [...new Map(enrolledSubjects.map((s) => [s.id, { id: s.id, label: s.name }])).values()]
    : [];

  const { data: textbooks } = useQuery({
    queryKey: ['student-textbooks', subjectId],
    queryFn: () => subjectId ? getTextbooksBySubject(subjectId) : Promise.resolve([]),
    enabled: !!subjectId,
  });
  const textbookList: { id: string; label: string }[] = (textbooks ?? []).map((t: any) => ({ id: t.id, label: t.title }));

  const { data: chapters } = useQuery({
    queryKey: ['student-chapters', textbookId],
    queryFn: () => textbookId ? getChaptersForTextbook(textbookId) : Promise.resolve([]),
    enabled: !!textbookId,
  });
  const chapterList: { id: string; label: string }[] = (chapters ?? []).map((ch: any) => ({ id: ch.id, label: `Chapter ${ch.order}: ${ch.title}` }));

  useEffect(() => { setTextbookId(''); setChapterId(''); }, [subjectId]);
  useEffect(() => { setChapterId(''); }, [textbookId]);

  useEffect(() => {
    if (chapterId && textbookId) {
      navigate(`/student/textbook/${textbookId}/chapter/${chapterId}`);
    }
  }, [chapterId, textbookId, navigate]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Subject</span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate max-w-[200px]"
        >
          <option value="">Select subject...</option>
          {uniqueSubjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      {subjectId && (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Textbook</span>
          <select
            value={textbookId}
            onChange={(e) => setTextbookId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate max-w-[200px]"
          >
            <option value="">Select textbook...</option>
            {textbookList.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      )}
      {textbookId && (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Chapter</span>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring truncate max-w-[200px]"
          >
            <option value="">Select chapter...</option>
            {chapterList.map((ch) => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
