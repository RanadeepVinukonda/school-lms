import { useState, useMemo } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type QuestionModel =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'fill_blank'
  | 'matching'
  | 'mcq'
  | 'numerical'
  | 'descriptive'
  | 'passage';

export interface V2Question {
  id: string;
  type: QuestionModel;
  text: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
  passageText?: string;
  order: number;
}

interface QuestionRendererProps {
  question: V2Question;
  answer: string;
  onAnswerChange: (value: string) => void;
  disabled?: boolean;
}

export function QuestionRendererV2({
  question,
  answer,
  onAnswerChange,
  disabled,
}: QuestionRendererProps) {
  // MCQ, multiple_choice
  if (question.type === 'mcq' || question.type === 'multiple_choice') {
    return (
      <RadioGroup value={answer} onValueChange={onAnswerChange} disabled={disabled} className="space-y-2">
        {question.options?.map((opt, i) => (
          <div key={i}>
            <RadioGroupItem value={opt} id={`q${question.id}_opt${i}`} className="peer sr-only" />
            <Label
              htmlFor={`q${question.id}_opt${i}`}
              className={cn(
                'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-base',
                'hover:bg-accent hover:border-primary/50',
                'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20',
                disabled && 'opacity-60 cursor-default',
              )}
            >
              <div
                className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  answer === opt ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                )}
              >
                {answer === opt && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <span>{opt}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  // Matching — two-column match interface
  if (question.type === 'matching') {
    return <MatchingRenderer question={question} answer={answer} onAnswerChange={onAnswerChange} disabled={disabled} />;
  }

  if (question.type === 'true_false') {
    return (
      <RadioGroup value={answer} onValueChange={onAnswerChange} disabled={disabled} className="grid grid-cols-2 gap-3">
        {['True', 'False'].map((opt) => {
          const isSelected = answer === opt;
          return (
            <div key={opt}>
              <RadioGroupItem value={opt} id={`q${question.id}_${opt.toLowerCase()}`} className="peer sr-only" />
              <Label
                htmlFor={`q${question.id}_${opt.toLowerCase()}`}
                className={cn(
                  'flex items-center justify-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-all text-base font-medium',
                  'hover:bg-accent hover:border-primary/50',
                  'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20',
                  disabled && 'opacity-60 cursor-default',
                  isSelected && opt === 'True' && 'peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-500/5',
                  isSelected && opt === 'False' && 'peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/5',
                )}
              >
                {opt}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    );
  }

  if (question.type === 'short_answer' || question.type === 'descriptive') {
    return (
      <Textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type your answer..."
        rows={4}
        disabled={disabled}
        className="text-base resize-y min-h-[120px]"
      />
    );
  }

  if (question.type === 'fill_blank' || question.type === 'numerical') {
    return (
      <Input
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        className="text-base"
      />
    );
  }

  if (question.type === 'passage') {
    return (
      <div className="space-y-4">
        {question.passageText && (
          <div className="p-4 rounded-xl bg-muted border border-outline-variant text-sm italic font-serif leading-relaxed">
            {question.passageText}
          </div>
        )}
        <div className="font-semibold text-base mb-2">Question: {question.text}</div>
        <RadioGroup value={answer} onValueChange={onAnswerChange} disabled={disabled} className="space-y-2">
          {question.options?.map((opt, i) => (
            <div key={i}>
              <RadioGroupItem value={opt} id={`q${question.id}_opt${i}`} className="peer sr-only" />
              <Label
                htmlFor={`q${question.id}_opt${i}`}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-base',
                  'hover:bg-accent hover:border-primary/50',
                  'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20',
                  disabled && 'opacity-60 cursor-default',
                )}
              >
                <div
                  className={cn(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    answer === opt ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}
                >
                  {answer === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span>{opt}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
      Unsupported question type: {question.type}
    </div>
  );
}

function MatchingRenderer({ question, answer, onAnswerChange, disabled }: QuestionRendererProps) {
  const shuffled = useMemo(() => {
    const pairs = (question.options || []).map(opt => {
      const sep = opt.includes(' - ') ? ' - ' : opt.includes(':') ? ': ' : '|';
      const idx = opt.indexOf(sep);
      return idx > 0
        ? { left: opt.slice(0, idx).trim(), right: opt.slice(idx + sep.length).trim() }
        : { left: opt, right: opt };
    });
    const rights = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
    return { pairs, rights };
  }, [question.options]);

  const selections = useState<Record<string, string>>(() => {
    const parsed: Record<string, string> = {};
    if (answer) {
      answer.split('|').forEach(part => {
        const [k, v] = part.split(':');
        if (k && v) parsed[k.trim()] = v.trim();
      });
    }
    return parsed;
  });
  const matchAnswers = selections[0];
  const setMatchAnswers = selections[1];

  const handleSelect = (left: string, right: string) => {
    const next = { ...matchAnswers, [left]: right };
    setMatchAnswers(next);
    const ordered = shuffled.pairs.map(p => `${p.left}:${next[p.left] || ''}`).join('|');
    onAnswerChange(ordered);
  };

  return (
    <div className="space-y-3">
      {shuffled.pairs.map(p => (
        <div key={p.left} className="flex items-center gap-3">
          <div className="flex-1 p-3 rounded-xl border-2 bg-card font-medium text-sm">{p.left}</div>
          <Select
            value={matchAnswers[p.left] || ''}
            onValueChange={(v) => handleSelect(p.left, v)}
            disabled={disabled}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select match..." />
            </SelectTrigger>
            <SelectContent>
              {shuffled.rights.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
