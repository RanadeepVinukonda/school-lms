import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { codingService } from '@/services/codingService';
import { useAuthStore } from '@/store/authStore';
import CodeEditor from '@/components/coding/CodeEditor';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/common/ErrorState';

export default function StudentCodingEditorPage() {
  const { _ } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'html'>('javascript');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['coding-project', id],
    queryFn: async () => {
      if (!id) throw new Error('No project ID');
      const p = await codingService.getProjectById(id);
      setCode(p.code || '');
      setTitle(p.title);
      setLanguage(p.language);
      return p;
    },
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('No project ID');
      return codingService.updateProject(id, { title, code, language });
    },
    onSuccess: () => {
      setSaved(true);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['coding-project', id] });
      setTimeout(() => setSaved(false), 2000);
      toast.success(_('Project saved'));
    },
    onError: () => {
      toast.error(_('Failed to save project'));
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setDirty(true);
  };

  const handleLanguageChange = (newLang: 'javascript' | 'python' | 'html') => {
    setLanguage(newLang);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="h-8 w-64 bg-surface-variant rounded animate-pulse mb-4" />
        <div className="h-[600px] bg-surface-variant rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <ErrorState
        title={_('Failed to load project')}
        message={_('The project you are looking for could not be found.')}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.STUDENT_CODING)}
            className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            {_('Back')}
          </button>
          <div className="h-5 w-px bg-outline-variant" />
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            className="text-lg font-semibold text-on-surface bg-transparent border-b-2 border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-1 py-0.5 transition-colors"
            placeholder={_('Project name')}
          />
          {dirty && <span className="text-label-xs text-amber-600">{_('Unsaved')}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            <Icon name={saved ? 'check' : 'save'} size={16} />
            {saveMutation.isPending ? _('Saving...') : saved ? _('Saved!') : _('Save')}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70 transition-colors">
            <Icon name="share" size={16} />
            {_('Share')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CodeEditor
          value={code}
          onChange={handleCodeChange}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      {project.ownerId !== user?.id && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-label-sm text-amber-700">
          <Icon name="info" size={16} />
          {_('View-only mode. You are a collaborator on this project.')}
        </div>
      )}
    </div>
  );
}
