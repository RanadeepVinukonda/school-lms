import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  // MCQ, multiple_choice and matching can be rendered as radio group selectors
  if (question.type === 'mcq' || question.type === 'multiple_choice' || question.type === 'matching') {
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
