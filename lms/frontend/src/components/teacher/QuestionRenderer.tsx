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
    // Attempt to parse standard matching formats
    // e.g., "Match the term... : 1. Term 1, 2. Term 2. A: Desc A, B: Desc B."
    
    // Simple regex to find where lists start
    const matchNumber1 = text.indexOf('1.');
    const matchLetterA = text.indexOf('A:') !== -1 ? text.indexOf('A:') : text.indexOf('A.');

    if (matchNumber1 !== -1 && matchLetterA !== -1 && matchNumber1 < matchLetterA) {
      const prompt = text.substring(0, matchNumber1).trim();
      const leftPart = text.substring(matchNumber1, matchLetterA).trim();
      const rightPart = text.substring(matchLetterA).trim();

      // Split left parts by "2.", "3.", etc.
      const leftItems = leftPart.split(/\d+\./).filter(s => s.trim().length > 0).map(s => s.replace(/,$/, '').trim());
      // Split right parts by "B:", "C:" or "B.", "C." etc.
      const rightItems = rightPart.split(/[A-Z][:.]/).filter(s => s.trim().length > 0).map(s => s.replace(/,$/, '').trim());

      return (
        <div className="space-y-4">
          <p className="text-body-md font-semibold text-on-surface">{prompt}</p>
          <div className="grid grid-cols-2 gap-4">
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
    
    // Fallback if parsing fails
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
