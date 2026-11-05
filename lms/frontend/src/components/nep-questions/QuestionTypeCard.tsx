import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface QuestionTypeCardProps {
  type: 'olympiad' | 'competency' | 'viva';
  selected: boolean;
  onToggle: () => void;
}

const typeConfig = {
  olympiad: {
    icon: 'emoji_events',
    title: 'Olympiad',
    description: 'Higher-order thinking & problem solving',
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
  },
  competency: {
    icon: 'psychology',
    title: 'Competency-Based',
    description: 'Real-world application & case studies',
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
  },
  viva: {
    icon: 'record_voice_over',
    title: 'Viva',
    description: 'Oral exam style with expected answers',
    color: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/10',
  },
};

export function QuestionTypeCard({ type, selected, onToggle }: QuestionTypeCardProps) {
  const config = typeConfig[type];

  return (
    <button

      type="button"
      onClick={onToggle}
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200 text-left w-full',
        selected
          ? `${config.borderColor} ${config.bgColor} shadow-md`
          : 'border-border/60 bg-surface hover:border-border',
      )}
    >
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg', config.color)}>
        <Icon name={config.icon} size={28} />
      </div>
      <div className="text-center">
        <p className="text-title-sm font-bold">{config.title}</p>
        <p className="text-label-sm text-muted-foreground mt-1">{config.description}</p>
      </div>
      {selected && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon name="check" size={16} />
        </div>
      )}
    </button>
  );
}
