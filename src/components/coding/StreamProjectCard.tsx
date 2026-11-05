import { Icon } from '@/components/ui/Icon';
import type { StreamProject } from '@/types/coding';

interface StreamProjectCardProps {
  project: StreamProject;
  onStart: (id: string) => void;
  progress?: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  science: 'bg-blue-50 border-blue-200 text-blue-700',
  technology: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  robotics: 'bg-amber-50 border-amber-200 text-amber-700',
  engineering: 'bg-orange-50 border-orange-200 text-orange-700',
  arts: 'bg-pink-50 border-pink-200 text-pink-700',
  mathematics: 'bg-purple-50 border-purple-200 text-purple-700',
  physics: 'bg-blue-50 border-blue-200 text-blue-700',
  chemistry: 'bg-green-50 border-green-200 text-green-700',
  biology: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  coding: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const DIFFICULTY_BADGES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function StreamProjectCard({ project, onStart, progress }: StreamProjectCardProps) {
  const progressPct = progress !== undefined ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <div className="p-5 rounded-xl border border-outline-variant bg-surface hover:shadow-md hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {project.subjects.slice(0, 3).map((s) => (
            <span
              key={s}
              className={`px-2.5 py-0.5 rounded text-xs font-medium capitalize border ${SUBJECT_COLORS[s] || 'bg-surface-variant text-on-surface-variant border-outline-variant'}`}
            >
              {s}
            </span>
          ))}
          {project.subjects.length > 3 && (
            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant">
              +{project.subjects.length - 3}
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize whitespace-nowrap ${DIFFICULTY_BADGES[project.difficulty] || ''}`}>
          {project.difficulty}
        </span>
      </div>

      <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">{project.title}</h3>
      <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{project.description}</p>

      <div className="mt-3 flex items-center gap-2 text-label-xs text-on-surface-variant">
        <Icon name="layers" size={14} />
        <span>{project.steps.length} steps</span>
        <Icon name="inventory_2" size={14} className="ml-2" />
        <span>{project.materials.length} materials</span>
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-label-xs text-on-surface-variant mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-surface-variant rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => onStart(project.id)}
        className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {progress !== undefined && progress > 0 ? 'Continue' : 'Start Project'}
      </button>
    </div>
  );
}
