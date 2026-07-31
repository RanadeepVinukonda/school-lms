import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getChildren } from '@/services/parentService';
import { hasAnyRole, hasRole } from '@/lib/roleHelpers';

type ReportCategory = 'suggestion' | 'complaint' | 'feedback' | 'improvement' | 'technical_issue';
type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

interface ReportFormData {
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  classId: string;
}

const CATEGORIES: { value: ReportCategory; label: string; icon: string }[] = [
  { value: 'suggestion', label: 'Suggestion', icon: 'lightbulb' },
  { value: 'complaint', label: 'Complaint', icon: 'report' },
  { value: 'feedback', label: 'Feedback', icon: 'feedback' },
  { value: 'improvement', label: 'Improvement Request', icon: 'trending_up' },
  { value: 'technical_issue', label: 'Technical Issue', icon: 'bug_report' },
];

interface Props {
  className?: string;
  onSuccess?: () => void;
}

export default function ReportFeedbackForm({ className: classnameProp, onSuccess }: Props) {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<ReportFormData>({
    title: '', description: '', category: 'feedback', priority: 'medium', classId: '',
  });

  const { data: classes } = useQuery({
    queryKey: ['report-feedback-classes', user?.id],
    queryFn: async () => {
      const role = user?.role || 'student';

      if (hasAnyRole(role, ['admin', 'teacher'])) {
        const res = await api.get('/classes');
        const payload = res.data?.data;
        return Array.isArray(payload) ? payload : payload?.items || [];
      }

      if (hasRole(role, 'parent')) {
        const children = await getChildren();
        const seen = new Map<string, { id: string; name: string }>();
        for (const child of children || []) {
          const classId = child.class_id || child.classIds?.[0];
          if (!classId) continue;
          const info = child.classInfo || {};
          const label = info.name || (info.grade ? `${info.grade}${info.section ? ` - ${info.section}` : ''}` : classId);
          if (!seen.has(classId)) seen.set(classId, { id: classId, name: label });
        }
        return Array.from(seen.values());
      }

      const classIds = user?.classIds?.length ? user.classIds : user?.classId ? [user.classId] : [];
      const own: { id: string; name: string }[] = [];
      for (const cid of classIds) {
        try {
          const res = await api.get(`/classes/${cid}`);
          const cls = res.data?.data;
          if (cls && cls.id) own.push({ id: cls.id, name: cls.name || cid });
        } catch {
          own.push({ id: cid, name: cid });
        }
      }
      return own;
    },
  });

  const classList = Array.isArray(classes) ? classes : classes?.items || [];

  const selectedClassName = classList.find((c: any) => c.id === form.classId)?.name || '';

  const mutation = useMutation({
    mutationFn: () => api.post('/report-feedback', {
      userId: user?.id || '',
      userName: user?.displayName || user?.email || '',
      userRole: user?.role || '',
      classId: form.classId,
      className: selectedClassName || classnameProp || '',
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
    }),
    onSuccess: () => {
      toast.success(_('Report submitted successfully'));
      setForm({ title: '', description: '', category: 'feedback', priority: 'medium', classId: '' });
      onSuccess?.();
    },
    onError: () => toast.error(_('Failed to submit report')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error(_('Title is required')); return; }
    if (!form.description.trim()) { toast.error(_('Description is required')); return; }
    if (!form.classId) { toast.error(_('Please select a class')); return; }
    mutation.mutate();
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-title-sm flex items-center gap-2">
          <Icon name="edit_note" size={20} className="text-primary" />
          {_('Write a Report / Suggestion')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block">{_('Category')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: c.value })}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                    form.category === c.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <Icon name={c.icon} size={20} />
                  <span className="text-[10px] text-center leading-tight">{_(c.label)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">{_('Priority')}</Label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'urgent'] as ReportPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    form.priority === p
                      ? p === 'urgent' ? 'border-rose-600 bg-rose-50 text-rose-700'
                        : p === 'high' ? 'border-red-500 bg-red-50 text-red-700'
                        : p === 'medium' ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-green-500 bg-green-50 text-green-700'
                      : 'border-border/60 text-muted-foreground hover:border-border'
                  }`}
                >
                  {_(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block" htmlFor="report-title">{_('Title')}</Label>
            <Input
              id="report-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={_('Brief title for your report')}
              required
            />
          </div>

          <div>
            <Label className="mb-1.5 block" htmlFor="report-desc">{_('Description')}</Label>
            <Textarea
              id="report-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={_('Describe your suggestion, issue, or feedback in detail')}
              rows={4}
              required
            />
          </div>

          <div>
            <Label className="mb-1.5 block" htmlFor="report-class">{_('Child\'s Class *')}</Label>
            <select
              id="report-class"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">{_('Select class')}</option>
              {classList.map((cls: any) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full gap-2" loading={mutation.isPending}>
            <Icon name="send" size={16} />
            {mutation.isPending ? _('Submitting...') : _('Submit Report')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
