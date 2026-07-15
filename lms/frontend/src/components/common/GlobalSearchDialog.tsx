import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { hasRole } from '@/lib/roleHelpers';
import { useQuery } from '@tanstack/react-query';
import { getAllSubjects, getAllUsers } from '@/services/dataService';
import { supabase } from '@/supabase/config';
import api from '@/services/api';
import type { Subject } from '@/types';
import type { AssignmentItem, ExamItem, UserDoc, LessonItem, QuizItem } from '@/services/dataService';

type Cat = 'subjects' | 'assignments' | 'exams' | 'teachers' | 'students' | 'lessons' | 'textbooks' | 'concepts' | 'pages';
interface Item { id: string; title: string; subtitle: string; icon: string; url: string; category: Cat; }
interface Results { subjects: Item[]; assignments: Item[]; exams: Item[]; teachers: Item[]; students: Item[]; lessons: Item[]; textbooks: Item[]; concepts: Item[]; pages: Item[]; }

interface PageEntry { id: string; title: string; keywords: string[]; icon: string; url: string; }

const PAGE_INDEX: PageEntry[] = [
  { id: 'admin-dashboard', title: 'Admin Dashboard', keywords: ['admin', 'dashboard', 'home'], icon: 'dashboard', url: ROUTES.ADMIN_DASHBOARD },
  { id: 'admin-students', title: 'Students', keywords: ['students', 'student', 'enrollment'], icon: 'people', url: ROUTES.ADMIN_STUDENTS },
  { id: 'admin-teachers', title: 'Teachers', keywords: ['teachers', 'teacher', 'staff'], icon: 'school', url: ROUTES.ADMIN_TEACHERS },
  { id: 'admin-classes', title: 'Classes', keywords: ['classes', 'class', 'sections', 'divisions'], icon: 'group', url: ROUTES.ADMIN_CLASSES },
  { id: 'admin-subjects', title: 'Subjects', keywords: ['subjects', 'subject', 'courses'], icon: 'menu_book', url: ROUTES.ADMIN_SUBJECTS },
  { id: 'admin-settings', title: 'Settings', keywords: ['settings', 'configuration', 'preferences'], icon: 'settings', url: ROUTES.ADMIN_SETTINGS },
  { id: 'admin-users', title: 'Users', keywords: ['users', 'user accounts', 'manage users'], icon: 'manage_accounts', url: ROUTES.ADMIN_USERS },
  { id: 'audit-logs', title: 'Audit Logs', keywords: ['audit', 'logs', 'activity', 'history'], icon: 'history', url: ROUTES.ADMIN_AUDIT_LOGS },
  { id: 'school-analytics', title: 'School Analytics', keywords: ['analytics', 'reports', 'statistics', 'insights'], icon: 'analytics', url: ROUTES.ADMIN_SCHOOL_ANALYTICS },
  { id: 'admin-attendance', title: 'Attendance', keywords: ['attendance', 'present', 'absent'], icon: 'fact_check', url: ROUTES.ADMIN_ATTENDANCE },
  { id: 'admin-fee', title: 'Fee Management', keywords: ['fee', 'fees', 'payments', 'finance', 'billing'], icon: 'payments', url: ROUTES.ADMIN_FEE },
  { id: 'admin-timetable', title: 'Timetable', keywords: ['timetable', 'schedule', 'periods'], icon: 'calendar_month', url: ROUTES.ADMIN_TIMETABLE },
  { id: 'admin-noticeboard', title: 'Noticeboard', keywords: ['noticeboard', 'notices', 'announcements', 'circulars'], icon: 'campaign', url: ROUTES.ADMIN_NOTICEBOARD },
  { id: 'erp-dashboard', title: 'ERP Dashboard', keywords: ['erp', 'enterprise', 'operations'], icon: 'business', url: ROUTES.ADMIN_ERP_DASHBOARD },
  { id: 'transport', title: 'Transport', keywords: ['transport', 'bus', 'routes', 'stops', 'vehicle'], icon: 'directions_bus', url: '/admin/transport' },
  { id: 'inventory', title: 'Inventory', keywords: ['inventory', 'stock', 'supplies', 'resources'], icon: 'inventory', url: '/admin/inventory' },
  { id: 'hr-staff', title: 'HR / Staff', keywords: ['hr', 'human resources', 'staff', 'employees'], icon: 'badge', url: '/admin/hr' },
  { id: 'payroll', title: 'Payroll', keywords: ['payroll', 'salary', 'compensation'], icon: 'payments', url: '/admin/hr/payroll' },
  { id: 'leave-management', title: 'Leave Management', keywords: ['leave', 'leaves', 'holiday', 'absence'], icon: 'event', url: '/admin/hr/leaves' },
  { id: 'classroom', title: 'Classroom', keywords: ['classroom', 'google classroom', 'integration'], icon: 'google', url: '/admin/classroom' },
  { id: 'lti', title: 'LTI Integration', keywords: ['lti', 'integration', 'tools', 'external'], icon: 'extension', url: '/admin/lti' },
  { id: 'academic-years', title: 'Academic Years', keywords: ['academic', 'years', 'sessions', 'terms'], icon: 'calendar_today', url: ROUTES.ADMIN_ACADEMIC_YEARS },
  { id: 'teacher-dashboard', title: 'Teacher Dashboard', keywords: ['teacher dashboard', 'my classes'], icon: 'dashboard', url: ROUTES.TEACHER_DASHBOARD },
  { id: 'teacher-students', title: 'My Students', keywords: ['my students', 'my pupils'], icon: 'people', url: ROUTES.TEACHER_STUDENTS },
  { id: 'teacher-exams', title: 'Exams', keywords: ['exams', 'examinations', 'tests', 'assessments'], icon: 'quiz', url: ROUTES.TEACHER_EXAMS },
  { id: 'teacher-textbooks', title: 'Textbooks', keywords: ['textbooks', 'books', 'chapters'], icon: 'menu_book', url: ROUTES.TEACHER_TEXTBOOKS },
  { id: 'teacher-profile', title: 'Profile', keywords: ['profile', 'my profile', 'account'], icon: 'person', url: ROUTES.TEACHER_PROFILE },
  { id: 'teacher-videos', title: 'Video Library', keywords: ['videos', 'video library', 'media'], icon: 'video_library', url: ROUTES.TEACHER_VIDEOS },
  { id: 'teacher-analytics', title: 'Analytics', keywords: ['analytics', 'performance', 'reports'], icon: 'analytics', url: ROUTES.TEACHER_ANALYTICS },
  { id: 'question-bank', title: 'Question Bank', keywords: ['question bank', 'questions', 'question paper'], icon: 'question_answer', url: ROUTES.TEACHER_QUESTION_BANK },
  { id: 'question-papers', title: 'Question Papers', keywords: ['question papers', 'pyq', 'previous year'], icon: 'description', url: ROUTES.TEACHER_QUESTION_PAPERS },
  { id: 'test-templates', title: 'Test Templates', keywords: ['test templates', 'test patterns', 'rubrics'], icon: 'fact_check', url: ROUTES.TEACHER_TEST_TEMPLATES },
  { id: 'test-schedule', title: 'Test Schedule', keywords: ['test schedule', 'exam schedule', 'test plan'], icon: 'schedule', url: ROUTES.TEACHER_TEST_SCHEDULE },
  { id: 'teacher-attendance', title: 'Attendance', keywords: ['attendance', 'mark attendance'], icon: 'fact_check', url: ROUTES.TEACHER_ATTENDANCE },
  { id: 'teacher-ocr', title: 'OCR Scanner', keywords: ['ocr', 'scan', 'scanner', 'optical character'], icon: 'document_scanner', url: ROUTES.TEACHER_OCR },
  { id: 'teacher-timetable', title: 'Timetable', keywords: ['timetable', 'schedule', 'periods'], icon: 'calendar_month', url: ROUTES.TEACHER_TIMETABLE },
  { id: 'nep-questions', title: 'NEP Questions', keywords: ['nep', 'competency', 'competency based'], icon: 'psychology', url: ROUTES.TEACHER_NEP_QUESTIONS },
  { id: 'rubrics', title: 'Rubrics', keywords: ['rubrics', 'rubric', 'grading criteria'], icon: 'checklist', url: ROUTES.TEACHER_RUBRICS },
  { id: 'unified-test', title: 'Unified Test Engine', keywords: ['unified test', 'test engine', 'adaptive test'], icon: 'precision_manufacturing', url: ROUTES.TEACHER_UNIFIED_TEST },
  { id: 'teacher-mindmaps', title: 'Mind Maps', keywords: ['mind maps', 'mindmap', 'concept map'], icon: 'account_tree', url: ROUTES.TEACHER_MIND_MAPS },
  { id: 'teacher-noticeboard', title: 'Noticeboard', keywords: ['noticeboard', 'notices', 'announcements'], icon: 'campaign', url: ROUTES.TEACHER_NOTICEBOARD },
  { id: 'teacher-pyq', title: 'Previous Year Questions', keywords: ['pyq', 'previous year', 'past papers'], icon: 'history', url: ROUTES.TEACHER_PYQ },
  { id: 'teacher-assessments', title: 'Assessments', keywords: ['assessments', 'create assessment'], icon: 'assignment', url: ROUTES.TEACHER_ASSESSMENTS },
  { id: 'student-dashboard', title: 'Student Dashboard', keywords: ['student dashboard', 'my learning'], icon: 'dashboard', url: ROUTES.STUDENT_DASHBOARD },
  { id: 'student-subjects', title: 'My Subjects', keywords: ['my subjects', 'courses', 'learning'], icon: 'school', url: ROUTES.STUDENT_SUBJECTS },
  { id: 'student-exams', title: 'My Exams', keywords: ['my exams', 'my tests'], icon: 'quiz', url: ROUTES.STUDENT_EXAMS },
  { id: 'student-tasks', title: 'My Tasks', keywords: ['tasks', 'assignments', 'homework', 'to-do'], icon: 'assignment', url: ROUTES.STUDENT_TASKS },
  { id: 'student-profile', title: 'Profile', keywords: ['profile', 'my profile'], icon: 'person', url: ROUTES.STUDENT_PROFILE },
  { id: 'ai-tutor', title: 'AI Tutor', keywords: ['ai tutor', 'ai', 'tutor', 'chat', 'assistant'], icon: 'smart_toy', url: ROUTES.STUDENT_AI_TUTOR },
  { id: 'virtual-labs', title: 'Virtual Labs', keywords: ['labs', 'virtual labs', 'experiments'], icon: 'science', url: ROUTES.STUDENT_LABS },
  { id: 'coding', title: 'Coding Platform', keywords: ['coding', 'programming', 'code'], icon: 'code', url: ROUTES.STUDENT_CODING },
  { id: 'mind-maps', title: 'Mind Maps', keywords: ['mind maps', 'mindmap', 'concept map'], icon: 'account_tree', url: ROUTES.STUDENT_MIND_MAPS },
  { id: 'stream-projects', title: 'Stream Projects', keywords: ['stream', 'projects', 'portfolio'], icon: 'folder', url: ROUTES.STUDENT_STREAM_PROJECTS },
  { id: 'gamification', title: 'Gamification', keywords: ['gamification', 'badges', 'points', 'rewards', 'leaderboard'], icon: 'emoji_events', url: ROUTES.STUDENT_GAMIFICATION },
  { id: 'leaderboard', title: 'Leaderboard', keywords: ['leaderboard', 'rankings', 'top students'], icon: 'leaderboard', url: ROUTES.STUDENT_LEADERBOARD },
  { id: 'student-ocr', title: 'OCR Scan', keywords: ['ocr', 'scan', 'scanner'], icon: 'document_scanner', url: ROUTES.STUDENT_OCR },
  { id: 'student-noticeboard', title: 'Noticeboard', keywords: ['noticeboard', 'announcements'], icon: 'campaign', url: ROUTES.STUDENT_NOTICEBOARD },
  { id: 'student-timetable', title: 'Timetable', keywords: ['timetable', 'schedule'], icon: 'calendar_month', url: ROUTES.STUDENT_TIMETABLE },
  { id: 'parent-dashboard', title: 'Parent Dashboard', keywords: ['parent dashboard', 'my children'], icon: 'dashboard', url: ROUTES.PARENT_DASHBOARD },
  { id: 'my-children', title: 'My Children', keywords: ['children', 'my children', 'kids', 'wards'], icon: 'child_care', url: ROUTES.PARENT_CHILDREN },
  { id: 'parent-reports', title: 'Reports', keywords: ['reports', 'progress', 'performance'], icon: 'assessment', url: ROUTES.PARENT_REPORTS },
  { id: 'parent-profile', title: 'Profile', keywords: ['profile', 'account'], icon: 'person', url: ROUTES.PARENT_PROFILE },
  { id: 'parent-noticeboard', title: 'Noticeboard', keywords: ['noticeboard', 'announcements', 'updates'], icon: 'campaign', url: ROUTES.PARENT_NOTICEBOARD },
  { id: 'notifications', title: 'Notifications', keywords: ['notifications', 'alerts', 'updates', 'messages'], icon: 'notifications', url: ROUTES.NOTIFICATIONS },
  { id: 'about', title: 'About School', keywords: ['about', 'school info', 'information'], icon: 'info', url: ROUTES.ABOUT },
  { id: 'forgot-password', title: 'Forgot Password', keywords: ['forgot', 'password', 'reset', 'recover'], icon: 'lock_reset', url: ROUTES.FORGOT_PASSWORD },
  { id: 'privacy', title: 'Privacy Policy', keywords: ['privacy', 'privacy policy', 'data'], icon: 'privacy_tip', url: '/privacy' },
  { id: 'terms', title: 'Terms & Conditions', keywords: ['terms', 'terms and conditions', 'legal'], icon: 'gavel', url: '/terms' },
  { id: 'k2', title: 'K2 Learning', keywords: ['k2', 'kindergarten', 'kids', 'tracing', 'phonics'], icon: 'toys', url: ROUTES.K2_DASHBOARD },
];

const CFG: Record<Cat, { l: string; i: string }> = {
  subjects: { l: 'Subjects', i: 'school' },
  assignments: { l: 'Assignments', i: 'assignment' },
  exams: { l: 'Exams', i: 'quiz' },
  teachers: { l: 'Teachers', i: 'person' },
  students: { l: 'Students', i: 'person' },
  lessons: { l: 'Lessons', i: 'book' },
  textbooks: { l: 'Textbooks', i: 'menu_book' },
  concepts: { l: 'Concepts', i: 'psychology' },
  pages: { l: 'Pages', i: 'explore' },
};

const CATS = Object.keys(CFG) as Cat[];
const EMPTY: Results = { subjects: [], assignments: [], exams: [], teachers: [], students: [], lessons: [], textbooks: [], concepts: [], pages: [] };

function link(cat: Cat, id: string, role: string): string {
  const m: Partial<Record<Cat, (i: string) => string>> = {
    subjects: (i) => (hasRole(role, 'admin') ? ROUTES.ADMIN_SUBJECTS : ROUTES.STUDENT_SUBJECT(i)),
    assignments: (i) => ROUTES.ASSIGNMENT_DETAIL(i),
    exams: (i) => ROUTES.EXAM_DETAIL(i),
    lessons: (i) => ROUTES.STUDENT_LESSON(i),
    teachers: () => (hasRole(role, 'admin') ? ROUTES.ADMIN_TEACHERS : ROUTES.TEACHER_DASHBOARD),
    students: () => (hasRole(role, 'admin') ? ROUTES.ADMIN_STUDENTS : hasRole(role, 'teacher') ? ROUTES.TEACHER_STUDENTS : ROUTES.STUDENT_DASHBOARD),
  };
  return m[cat]?.(id) || '#';
}

interface SearchData {
  subjects: Subject[];
  assignments: AssignmentItem[];
  exams: ExamItem[];
  users: UserDoc[];
  lessons: LessonItem[];
}

export function useSearch(
  query: string,
  data?: SearchData,
): { results: Results; isLoading: boolean } {
  const [loading, setLoading] = useState(false);
  const sb = data?.subjects ?? [];
  const as = data?.assignments ?? [];
  const ex = data?.exams ?? [];
  const us = data?.users ?? [];
  const ls = data?.lessons ?? [];

  const results = useMemo((): Results => {
    if (!query.trim()) return EMPTY;
    const q = query.toLowerCase();
    return {
      subjects: (sb as Subject[]).filter((s) => [s.name, s.code, s.category].some((f) => f.toLowerCase().includes(q)))
        .map((s) => ({ id: s.id, title: s.name, subtitle: `${s.code} · ${s.category}`, icon: s.icon || 'school', url: '', category: 'subjects' as Cat })),
      assignments: as.filter((a) => [a.title, a.description].some((f) => f?.toLowerCase().includes(q) ?? false))
        .map((a) => ({ id: a.id, title: a.title, subtitle: `Due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'}`, icon: 'assignment', url: '', category: 'assignments' as Cat })),
      exams: ex.filter((e) => [e.title, e.description].some((f) => f?.toLowerCase().includes(q) ?? false))
        .map((e) => ({ id: e.id, title: e.title, subtitle: `${e.startDate ? new Date(e.startDate).toLocaleDateString() : ''} · ${e.duration}min`, icon: 'quiz', url: '', category: 'exams' as Cat })),
      teachers: us.filter((t) => hasRole(t.role, 'teacher') && t.displayName.toLowerCase().includes(q))
        .map((t) => ({ id: t.id, title: t.displayName, subtitle: 'Teacher', icon: 'person', url: '', category: 'teachers' as Cat })),
      students: us.filter((s) => hasRole(s.role, 'student') && s.displayName.toLowerCase().includes(q))
        .map((s) => ({ id: s.id, title: s.displayName, subtitle: s.studentId || 'Student', icon: 'person', url: '', category: 'students' as Cat })),
      lessons: ls.filter((l) => [l.title, l.content].some((f) => f?.toLowerCase().includes(q) ?? false))
        .map((l) => ({ id: l.id, title: l.title, subtitle: `Lesson · ${l.contentType}`, icon: 'book', url: '', category: 'lessons' as Cat })),
      textbooks: [],
      concepts: [],
      pages: PAGE_INDEX.filter((p) => {
        const q = query.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.keywords.some((k) => k.toLowerCase().includes(q));
      }).map((p) => ({
        id: p.id, title: p.title, subtitle: 'Page', icon: p.icon, url: p.url, category: 'pages' as Cat,
      })),
    };
  }, [query, sb, as, ex, us, ls]);

  useEffect(() => {
    if (!query.trim()) { setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, [query]);

  return { results, isLoading: loading };
}

interface Props { isOpen: boolean; onClose: () => void; }

export function GlobalSearchDialog({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const role = useAuthStore((s) => s.user?.role ?? 'student');


  const { data: searchData } = useQuery({
    queryKey: ['global-search-data'],
    queryFn: async (): Promise<SearchData> => {
      const [subjects, users, assignmentsData, examsData, lessonsData] = await Promise.all([
        getAllSubjects(),
        getAllUsers(),
        supabase.from('assignments').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('lessons').select('*'),
      ]);

      return {
        subjects: subjects as unknown as Subject[],
        users,
        assignments: (assignmentsData.data || []) as unknown as AssignmentItem[],
        exams: (examsData.data || []) as unknown as ExamItem[],
        lessons: (lessonsData.data || []) as unknown as LessonItem[],
      };
    },
    enabled: isOpen,
    staleTime: 60000,
  });

  const { results: localResults, isLoading: localLoading } = useSearch(query, searchData);

  const { data: esData, isLoading: esLoading } = useQuery({
    queryKey: ['es-global-search', query],
    queryFn: async () => {
      if (!query.trim()) return null;
      const res = await api.get('/search', { params: { q: query } });
      return res.data?.data;
    },
    enabled: isOpen && query.trim().length > 0,
    staleTime: 5000,
  });

  const results = useMemo((): Results => {
    const res = { ...localResults };
    if (esData) {
      if (esData.textbooks) {
        res.textbooks = esData.textbooks.map((tb: any) => ({
          id: tb.id,
          title: tb.title,
          subtitle: `Textbook · ${tb.subject || ''}`,
          icon: 'menu_book',
          url: `/student/textbooks/${tb.id}`,
          category: 'textbooks'
        }));
      }
      if (esData.concepts) {
        res.concepts = esData.concepts.map((cp: any) => ({
          id: cp.id,
          title: cp.title,
          subtitle: `Concept`,
          icon: 'psychology',
          url: `/student/concepts/${cp.id}`,
          category: 'concepts'
        }));
      }
    }
    return res as Results;
  }, [localResults, esData]);

  const isLoading = localLoading || esLoading;

  const flat = useMemo(() => {
    const items: (Item & { cl: string })[] = [];
    for (const cat of CATS) {
      for (const item of results[cat]) {
        items.push({
          ...item,
          cl: CFG[cat].l,
          url: item.category === 'textbooks' || item.category === 'concepts' || item.category === 'pages' ? item.url : link(cat, item.id, role)
        });
      }
    }
    return items;
  }, [results, role]);

  const catsWithItems = CATS.filter((cat) => results[cat] && results[cat].length > 0);

  useEffect(() => {
    if (isOpen) { setQuery(''); setSel(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); return; }
      if (!flat.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => (i + 1) % flat.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => (i - 1 + flat.length) % flat.length); return; }
      if (e.key === 'Enter') { e.preventDefault(); const item = flat[sel]; if (item) { navigate(item.url); onClose(); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, navigate, flat, sel]);

  useEffect(() => {
    if (sel < 0 || !listRef.current) return;
    listRef.current.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const pick = useCallback((item: Item & { url: string }) => { navigate(item.url); onClose(); }, [navigate, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }} role="dialog" aria-modal="true" aria-label="Global search"
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/50">
              <Icon name="search" size={24} className="text-on-surface-variant shrink-0" />
              <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setSel(0); }}
                placeholder="Search subjects, assignments, exams..."
                className="flex-1 bg-transparent text-xl outline-none placeholder:text-on-surface-variant/50 text-on-surface" aria-label="Search across the LMS" />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-secondary-container/50 transition-colors shrink-0" aria-label="Clear search">
                  <Icon name="close" size={20} className="text-on-surface-variant" />
                </button>
              )}
            </div>

            <div ref={listRef} className="overflow-y-auto max-h-[70vh] p-2">
              {!query.trim() && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/60">
                  <Icon name="search_hands_free" size={48} />
                  <p className="mt-4 text-body-md">Start typing to search...</p>
                </div>
              )}

              {isLoading && (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && query.trim() && !flat.length && (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/60">
                  <Icon name="search_off" size={48} />
                  <p className="mt-4 text-body-md">No results found for &ldquo;<span className="font-medium text-on-surface">{query}</span>&rdquo;</p>
                </div>
              )}

              {!isLoading && flat.length > 0 && (
                <div>
                  {catsWithItems.map((cat) => {
                    const items = results[cat];
                    const { l, i: icon } = CFG[cat];
                    return (
                      <div key={cat} className="mb-2">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">{l}</span>
                          <span className="text-xs text-on-surface-variant/60 bg-secondary-container/40 px-1.5 py-0.5 rounded-full">{items.length}</span>
                        </div>
                        {items.map((item) => {
                          const fi = flat.findIndex((f) => f.id === item.id && f.category === cat);
                          return (
                            <button key={`${cat}-${item.id}`} data-i={fi}
                              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors', fi === sel ? 'bg-secondary-container' : 'hover:bg-secondary-container/50')}
                              onClick={() => pick({ ...item, url: item.category === 'textbooks' || item.category === 'concepts' || item.category === 'pages' ? item.url : link(cat, item.id, role) })} onMouseEnter={() => setSel(fi)}>
                              <Icon name={icon} size={20} className="text-on-surface-variant shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-on-surface truncate">{item.title}</p>
                                <p className="text-xs text-on-surface-variant truncate">{item.subtitle}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {flat.length > 0 && (
              <div className="flex items-center gap-4 px-5 py-2.5 border-t border-outline-variant/50 text-xs text-on-surface-variant/60">
                <span>&uarr;&darr; Navigate</span>
                <span>&#8629; Open</span>
                <span>Esc Close</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GlobalSearchDialog;
