import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { virtualLabsService } from '@/services/virtualLabsService';
import { useAuthStore } from '@/store/authStore';
import type { VirtualLab } from '@/types/virtualLab';
import CircuitLab from '@/components/virtual-labs/CircuitLab';
import MechanicsLab from '@/components/virtual-labs/MechanicsLab';
import ReactionLab from '@/components/virtual-labs/ReactionLab';
import CellExplorer from '@/components/virtual-labs/CellExplorer';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';

const SUBJECT_LABELS: Record<string, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
};

const SIMULATION_COMPONENTS: Record<string, React.FC> = {
  circuit: CircuitLab,
  mechanics: MechanicsLab,
  reaction: ReactionLab,
  cell: CellExplorer,
};

export default function StudentVirtualLabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [lab, setLab] = useState<VirtualLab | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    virtualLabsService.getById(id)
      .then(setLab)
      .catch(() => navigate(ROUTES.STUDENT_LABS, { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      await virtualLabsService.markComplete(id);
      setCompleted(true);
    } catch {
      //
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="h-8 w-64 bg-surface-variant rounded animate-pulse mb-4" />
        <div className="h-4 w-96 bg-surface-variant rounded animate-pulse mb-8" />
        <div className="h-96 bg-surface-variant rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!lab) return null;

  const SimulationComponent = SIMULATION_COMPONENTS[lab.type];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={() => navigate(ROUTES.STUDENT_LABS)}
        className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Icon name="arrow_back" size={16} />
        Back to Labs
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-medium capitalize bg-surface-variant text-on-surface-variant">
              {SUBJECT_LABELS[lab.subject] || lab.subject}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium capitalize bg-surface-variant text-on-surface-variant">
              {lab.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-medium capitalize bg-surface-variant text-on-surface-variant">
              {lab.type}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">{lab.title}</h1>
          <p className="text-on-surface-variant mt-1">{lab.description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface p-4 sm:p-6">
        <div className="mb-4 pb-3 border-b border-outline-variant/50">
          <p className="text-label-sm font-medium text-on-surface-variant">Instructions</p>
          <p className="text-sm text-on-surface mt-1">
            Interact with the simulation below. Drag components, adjust controls, and observe the results. Click "Complete Lab" when you are done.
          </p>
        </div>

        {SimulationComponent ? (
          <SimulationComponent />
        ) : (
          <div className="text-center py-16">
            <Icon name="construction" size={48} className="text-on-surface-variant/40 mx-auto" />
            <p className="text-on-surface-variant mt-4">Simulation type "{lab.type}" is coming soon</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleComplete}
          disabled={completing || completed}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
            completed
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          }`}
        >
          {completing ? 'Completing...' : completed ? '✓ Completed!' : 'Complete Lab'}
        </button>
      </div>

      {completed && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <Icon name="emoji_events" size={24} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-green-800">Lab Completed! +100 XP</p>
            <p className="text-label-sm text-green-600">Great work exploring the simulation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
