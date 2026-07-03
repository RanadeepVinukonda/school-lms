import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { codingService } from '@/services/codingService';
import type { StreamProject } from '@/types/coding';
import StreamProjectCard from '@/components/coding/StreamProjectCard';
import { Icon } from '@/components/ui/Icon';

const ALL_SUBJECTS = ['science', 'technology', 'engineering', 'arts', 'mathematics', 'coding', 'robotics'];

export default function StudentStreamProjectsPage() {
  const { _ } = useTranslation();
  const [projects, setProjects] = useState<StreamProject[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    codingService.getAllStreamProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter((p) => p.subjects.includes(filter));

  const handleStart = (id: string) => {
    // In a full implementation, navigate to project detail
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{_('STREAM Projects')}</h1>
        <p className="text-on-surface-variant mt-1">{_('Cross-subject collaborative projects integrating Science, Technology, Robotics, Engineering, Arts, and Mathematics')}</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
{_('All')}
        </button>
        {ALL_SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-surface-variant animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="school" size={48} className="text-on-surface-variant/40 mx-auto" />
          <p className="text-on-surface-variant mt-4">{_('No STREAM projects available yet')}</p>
          <p className="text-label-sm text-on-surface-variant/60 mt-1">{_('Check back soon for new projects')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <StreamProjectCard
              key={project.id}
              project={project}
              onStart={handleStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
