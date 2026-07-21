import React from 'react';
import { Badge } from '@/components/ui/badge';

interface QuestionProps {
  question: {
    type: string;
    text: string;
    options?: string[];
    correctAnswer?: string | string[];
    explanation?: string;
  };
}

export function QuestionRenderer({ question }: QuestionProps) {
  const { type, text } = question;

  const renderMatching = () => {
    const { options } = question;

    if (options && options.length > 0) {
      const pairs = options.map((opt) => {
        const sep = opt.includes(' - ') ? ' - ' : opt.includes(': ') ? ': ' : '|';
        const idx = opt.indexOf(sep);
        return idx > 0
          ? { left: opt.slice(0, idx).trim(), right: opt.slice(idx + sep.length).trim() }
          : { left: opt, right: '' };
      });
      const leftItems = pairs.map((p) => p.left);
      const rightItems = [...new Set(pairs.map((p) => p.right))];

      return (
        <div className="space-y-4">
          <p className="text-body-md font-semibold text-on-surface">{text}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-variant/20 border border-outline-variant/40 rounded-xl p-4">
              <h4 className="text-label-xs font-bold text-primary mb-2 uppercase tracking-wide border-b border-outline-variant/40 pb-2">Column 1</h4>
              <ul className="space-y-3">
                {leftItems.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-body-sm text-on-surface">
                    <span className="font-bold text-muted-foreground w-4 text-right flex-shrink-0">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-variant/20 border border-outline-variant/40 rounded-xl p-4">
              <h4 className="text-label-xs font-bold text-secondary mb-2 uppercase tracking-wide border-b border-outline-variant/40 pb-2">Column 2</h4>
              <ul className="space-y-3">
                {rightItems.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-body-sm text-on-surface">
                    <span className="font-bold text-muted-foreground w-4 text-right flex-shrink-0">{String.fromCharCode(65 + idx)}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-body-md font-semibold text-on-surface leading-snug">{text}</p>;
  };

  const renderFillInBlank = () => {
    // Replace ____ or similar with a visual blank space
    const parts = text.split(/_+/);
    if (parts.length > 1) {
      return (
        <p className="text-body-md font-semibold text-on-surface leading-loose">
          {parts.map((part, idx) => (
            <React.Fragment key={idx}>
              {part}
              {idx < parts.length - 1 && (
                <span className="inline-block w-24 h-6 border-b-2 border-outline-variant mx-2 align-middle bg-surface-variant/30 rounded-t-sm" />
              )}
            </React.Fragment>
          ))}
        </p>
      );
    }
    return <p className="text-body-md font-semibold text-on-surface leading-snug">{text}</p>;
  };

  const renderDefault = () => {
    return <p className="text-body-md font-semibold text-on-surface leading-snug">{text}</p>;
  };

  if (type.toLowerCase() === 'matching') {
    return renderMatching();
  }
  if (type.toLowerCase() === 'fill_blank' || type.toLowerCase() === 'fill_in_the_blank') {
    return renderFillInBlank();
  }

  return renderDefault();
}
