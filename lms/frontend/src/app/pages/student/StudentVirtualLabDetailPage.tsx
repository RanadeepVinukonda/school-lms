import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { virtualLabsService } from '@/services/virtualLabsService';
import { useAuthStore } from '@/store/authStore';
import CircuitLab from '@/components/virtual-labs/CircuitLab';
import MechanicsLab from '@/components/virtual-labs/MechanicsLab';
import ReactionLab from '@/components/virtual-labs/ReactionLab';
import CellExplorer from '@/components/virtual-labs/CellExplorer';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

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
  const { _ } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [completed, setCompleted] = useState(false);

  const { data: lab, isLoading, error } = useQuery({
    queryKey: ['virtual-lab', id],
    queryFn: async () => {
      if (!id) throw new Error('No lab ID');
      const lab = await virtualLabsService.getById(id);
      return lab;
    },
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('No lab ID');
      return virtualLabsService.markComplete(id);
    },
    onSuccess: () => {
      setCompleted(true);
      toast.success(_('Lab completed! +100 XP'));
      queryClient.invalidateQueries({ queryKey: ['student-virtual-labs', user?.id] });
    },
    onError: () => {
      toast.error(_('Failed to mark lab as complete'));
    },
  });

  if (isLoading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (error || !lab) {
    return (
      <ErrorState
        title={_('Failed to load lab')}
        message={_('The virtual lab could not be found.')}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const SimulationComponent = SIMULATION_COMPONENTS[lab.type];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={() => navigate(ROUTES.STUDENT_LABS)}
        className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Icon name="arrow_back" size={16} />
        {_('Back to Labs')}
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
          <p className="text-label-sm font-medium text-on-surface-variant">{_('Instructions')}</p>
          <p className="text-sm text-on-surface mt-1">
            {_('Interact with the simulation below. Drag components, adjust controls, and observe the results. Click "Complete Lab" when you are done.')}
          </p>
        </div>

        {SimulationComponent ? (
          <SimulationComponent />
        ) : (
          <div className="text-center py-16">
            <Icon name="construction" size={48} className="text-on-surface-variant/40 mx-auto" />
            <p className="text-on-surface-variant mt-4">{_('Simulation type')} "{lab.type}" {_('is coming soon')}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => completeMutation.mutate()}
          disabled={completeMutation.isPending || completed}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
            completed
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
          }`}
        >
          {completeMutation.isPending ? _('Completing...') : completed ? '✓ ' + _('Completed!') : _('Complete Lab')}
        </button>
      </div>

      {completed && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
          <Icon name="emoji_events" size={24} className="text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-green-800">{_('Lab Completed! +100 XP')}</p>
            <p className="text-label-sm text-green-600">{_('Great work exploring the simulation.')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
