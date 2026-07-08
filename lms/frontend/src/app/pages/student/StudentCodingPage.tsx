import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { codingService } from '@/services/codingService';
import { useAuthStore } from '@/store/authStore';
import type { CodingProject } from '@/types/coding';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';

const LANGUAGE_BADGES: Record<string, string> = {
  javascript: 'bg-yellow-100 text-yellow-700',
  python: 'bg-blue-100 text-blue-700',
  html: 'bg-orange-100 text-orange-700',
};

export default function StudentCodingPage() {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'projects' | 'stream'>('projects');

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['student-coding-projects', user?.id],
    queryFn: () => codingService.getAllProjects(),
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => codingService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-coding-projects', user?.id] });
      toast.success(_('Project deleted'));
    },
    onError: () => toast.error(_('Failed to delete project')),
  });

  const createMutation = useMutation({
    mutationFn: () => codingService.createProject({
      title: 'Untitled Project',
      language: 'javascript' as const,
      code: '',
      ownerId: user!.id,
    }),
    onSuccess: (project) => {
      navigate(ROUTES.STUDENT_CODING_EDITOR(project.id));
    },
    onError: () => toast.error(_('Failed to create project')),
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{_('Coding Workspace')}</h1>
          <p className="text-on-surface-variant mt-1">{_('Write, run, and collaborate on code projects')}</p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Icon name="add" size={18} />
          {createMutation.isPending ? _('Creating...') : _('New Project')}
        </button>
      </div>

      <div className="flex gap-2 border-b border-outline-variant">
        {[
          { key: 'projects', label: _('My Projects'), icon: 'code' },
          { key: 'stream', label: _('STREAM Projects'), icon: 'school' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as 'projects' | 'stream');
              if (tab.key === 'stream') navigate(ROUTES.STUDENT_STREAM_PROJECTS);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={tab.icon} size={18} />
            {tab.label}
          </button>
        ))}
      </div>              {isLoading ? (
        <LoadingSkeleton type="card" />
      ) : error ? (
        <ErrorState title={_('Failed to load projects')} message={_('Could not fetch coding projects')} onRetry={() => refetch()} />
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="code" size={48} className="text-on-surface-variant/40 mx-auto" />
          <p className="text-on-surface-variant mt-4">{_('No coding projects yet')}</p>
          <p className="text-label-sm text-on-surface-variant/60 mt-1">{_('Create your first project to get started')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(ROUTES.STUDENT_CODING_EDITOR(project.id))}
              className="p-5 rounded-xl border border-outline-variant bg-surface hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded text-xs font-medium capitalize ${LANGUAGE_BADGES[project.language] || ''}`}>
                  {project.language}
                </span>
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="text-on-surface-variant/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
              <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{project.title}</h3>
              <p className="text-label-xs text-on-surface-variant mt-2">
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </p>
              {project.collaborators.length > 0 && (
                <div className="flex items-center gap-1 mt-2 text-label-xs text-on-surface-variant">
                  <Icon name="group" size={12} />
                  <span>{project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
