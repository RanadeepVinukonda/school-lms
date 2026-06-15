import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { codingService } from '@/services/codingService';
import { useAuthStore } from '@/store/authStore';
import type { CodingProject } from '@/types/coding';
import CodeEditor from '@/components/coding/CodeEditor';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';

export default function StudentCodingEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [project, setProject] = useState<CodingProject | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'html'>('javascript');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    codingService.getProjectById(id)
      .then((p) => {
        setProject(p);
        setCode(p.code || '');
        setTitle(p.title);
        setLanguage(p.language);
      })
      .catch(() => navigate(ROUTES.STUDENT_CODING, { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      await codingService.updateProject(id, { title, code, language });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  }, [id, title, code, language]);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="h-8 w-64 bg-surface-variant rounded animate-pulse mb-4" />
        <div className="h-[600px] bg-surface-variant rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.STUDENT_CODING)}
            className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Icon name="arrow_back" size={16} />
            Back
          </button>
          <div className="h-5 w-px bg-outline-variant" />
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            className="text-lg font-semibold text-on-surface bg-transparent border-b-2 border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-1 py-0.5 transition-colors"
            placeholder="Project name"
          />
          {dirty && <span className="text-label-xs text-amber-600">Unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            } disabled:opacity-50`}
          >
            <Icon name={saved ? 'check' : 'save'} size={16} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70 transition-colors">
            <Icon name="share" size={16} />
            Share
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
          View-only mode. You are a collaborator on this project.
        </div>
      )}
    </div>
  );
}
