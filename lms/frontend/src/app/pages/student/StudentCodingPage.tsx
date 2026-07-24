import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { codingService } from '@/services/codingService';
import { useAuthStore } from '@/store/authStore';
import type { CodingProject, CodingLanguage } from '@/types/coding';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import CodeEditor from '@/components/coding/CodeEditor';

const LANGUAGE_BADGES: Record<string, string> = {
  javascript: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  python: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  html: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  java: 'bg-red-500/15 text-red-600 dark:text-red-400',
  c: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
  cpp: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
};

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JS',
  python: 'Py',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  html: 'HTML',
};

export default function StudentCodingPage() {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(() => window.innerWidth >= 768);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('Untitled Project');
  const [language, setLanguage] = useState<CodingLanguage>('javascript');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['student-coding-projects', user?.id],
    queryFn: () => codingService.getAllProjects(),
    enabled: !!user?.id,
  });

  const { data: selectedProject, isLoading: loadingProject } = useQuery({
    queryKey: ['coding-project', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      return codingService.getProjectById(selectedId);
    },
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (selectedProject) {
      setCode(selectedProject.code || '');
      setTitle(selectedProject.title);
      setLanguage(selectedProject.language);
      setDirty(false);
    }
  }, [selectedProject]);

  const createMutation = useMutation({
    mutationFn: () => codingService.createProject({
      title: 'Untitled Project',
      language: 'javascript',
      code: '',
      ownerId: user!.id,
    }),
    onSuccess: (project) => {
      setSelectedId(project.id);
      setCode('');
      setTitle('Untitled Project');
      setLanguage('javascript');
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['student-coding-projects', user?.id] });
    },
    onError: () => toast.error(_('Failed to create project')),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('No project');
      return codingService.updateProject(selectedId, { title, code, language });
    },
    onSuccess: () => {
      setDirty(false);
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['coding-project', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['student-coding-projects', user?.id] });
      setTimeout(() => setSaved(false), 2000);
      toast.success(_('Saved'));
    },
    onError: () => toast.error(_('Failed to save')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => codingService.deleteProject(id),
    onSuccess: () => {
      if (selectedId) {
        setSelectedId(null);
        setCode('');
        setTitle('Untitled Project');
        setDirty(false);
      }
      queryClient.invalidateQueries({ queryKey: ['student-coding-projects', user?.id] });
      toast.success(_('Project deleted'));
    },
    onError: () => toast.error(_('Failed to delete')),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedId && dirty) saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, dirty, saveMutation]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setDirty(true);
  }, []);

  const handleLanguageChange = useCallback((lang: CodingLanguage) => {
    setLanguage(lang);
    setDirty(true);
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setDirty(true);
  }, []);

  const handleNewProject = () => {
    createMutation.mutate();
  };

  const handleSelectProject = (id: string) => {
    if (dirty && selectedId) {
      saveMutation.mutate();
    }
    setSelectedId(id);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      {drawerOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setDrawerOpen(false)} />
          <div className="w-72 shrink-0 border-r border-outline-variant bg-surface flex flex-col overflow-hidden max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl">
            <div className="p-3 border-b border-outline-variant">
              <div className="flex items-center justify-between mb-2 md:hidden">
                <span className="text-sm font-semibold text-on-surface">{_('Projects')}</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-variant/50">
                  <Icon name="close" size={18} />
                </button>
              </div>
              <button
                onClick={handleNewProject}
                disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Icon name="add" size={18} />
                {createMutation.isPending ? _('Creating...') : _('New Project')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-surface-variant animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-3">
                  <ErrorState title={_('Error')} message={_('Failed to load')} onRetry={() => refetch()} />
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Icon name="code" size={40} className="text-on-surface-variant/30 mb-3" />
                  <p className="text-sm text-on-surface-variant">{_('No projects yet')}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-1">{_('Create one to start coding')}</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleSelectProject(project.id)}
                      className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedId === project.id
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'hover:bg-surface-variant/50 text-on-surface-variant'
                      }`}
                    >
                      <span className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold ${LANGUAGE_BADGES[project.language] || ''}`}>
                        {LANGUAGE_LABELS[project.language] || project.language[0]?.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{project.title}</p>
                        <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(_('Delete this project?'))) {
                            deleteMutation.mutate(project.id);
                          }
                        }}
                        className="shrink-0 mt-0.5 text-on-surface-variant/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant bg-surface">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
            title={drawerOpen ? _('Hide projects') : _('Show projects')}
          >
            <Icon name={drawerOpen ? 'chevron_left' : 'chevron_right'} size={20} />
          </button>
          <div className="h-5 w-px bg-outline-variant" />
          {selectedId ? (
            <>
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-sm font-semibold text-on-surface bg-transparent border-b-2 border-transparent hover:border-outline-variant focus:border-primary focus:outline-none px-1 py-0.5 min-w-0 max-w-xs transition-colors"
                placeholder={_('Project name')}
              />
              {dirty && <span className="text-[11px] text-amber-600 shrink-0">{_('Unsaved')}</span>}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => { if (dirty) saveMutation.mutate(); }}
                  disabled={!selectedId || saveMutation.isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    saved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  } disabled:opacity-50`}
                >
                  <Icon name={saved ? 'check' : 'save'} size={14} />
                  {saveMutation.isPending ? _('Saving...') : saved ? _('Saved!') : _('Save')}
                </button>
                <span className="text-[11px] text-on-surface-variant/50">
                  Ctrl+S
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">{_('Select a project or create a new one')}</p>
          )}
        </div>

        <div className="flex-1 min-h-0 p-3">
          {loadingProject && selectedId ? (
            <div className="h-full rounded-xl bg-surface-variant animate-pulse" />
          ) : selectedId ? (
            <div className="h-full">
              <CodeEditor
                value={code}
                onChange={handleCodeChange}
                language={language}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/50 text-on-surface-variant/40">
              <Icon name="code" size={56} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">{_('Start coding')}</p>
              <p className="text-sm mt-1">{_('Select a project or create a new one')}</p>
              <button
                onClick={handleNewProject}
                disabled={createMutation.isPending}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Icon name="add" size={18} />
                {_('New Project')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
