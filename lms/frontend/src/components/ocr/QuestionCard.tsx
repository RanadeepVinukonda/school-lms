import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import type { GeneratedQuestion } from '@/types/ocr';

function QuestionCard({ q, index, onEdit, onDelete }: { q: GeneratedQuestion; index: number; onEdit?: (id: string, field: string, value: string | string[]) => void; onDelete?: (id: string) => void }) {
  const { _ } = useTranslation();
  const [showAnswer, setShowAnswer] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="p-4 rounded-lg border border-outline-variant">
      <div className="flex items-start justify-between gap-2 mb-2">
        {editing ? (
          <Input
            value={q.question}
            onChange={(e) => onEdit?.(q.id, 'question', e.target.value)}
            className="text-sm font-semibold h-9"
          />
        ) : (
          <span className="text-sm font-semibold">Q{index + 1}. {q.question}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className="text-label-xs">{q.type.replace('_', ' ')}</Badge>
          {onEdit && (
            <button
              onClick={() => setEditing(!editing)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Icon name={editing ? 'check' : 'edit'} size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(q.id)}
              className="p-1 rounded hover:bg-error/10 text-muted-foreground hover:text-error transition-colors"
            >
              <Icon name="delete" size={14} />
            </button>
          )}
        </div>
      </div>
      {q.options && (
        <div className="space-y-1.5 mt-2">
          {q.options.map((opt, j) => (
            editing ? (
              <Input
                key={j}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(q.options || [])];
                  newOpts[j] = e.target.value;
                  onEdit?.(q.id, 'options', newOpts);
                }}
                className="text-sm h-9"
              />
            ) : (
              <div key={j} className="px-3 py-2 rounded-lg border border-outline-variant text-sm">{opt}</div>
            )
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border">
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="flex items-center gap-1.5 text-label-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Icon name={showAnswer ? 'visibility_off' : 'visibility'} size={14} />
          {showAnswer ? _('Hide Answer') : _('Show Answer')}
        </button>
        {showAnswer && (
          <div className="mt-2 p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-label-xs font-semibold text-success mb-1">{_('Correct Answer:')}</p>
            <p className="text-sm">{q.correctAnswer}</p>
            {q.explanation && (
              <p className="text-label-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-success/10">{q.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { QuestionCard };
