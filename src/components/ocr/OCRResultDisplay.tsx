import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OCRResult, GeneratedQuestion, ConceptOption } from '@/types/ocr';

interface OCRResultDisplayProps {
  ocrResult: OCRResult | null;
  imageUrl?: string;
  concepts: ConceptOption[];
  selectedConceptId: string;
  onConceptChange: (conceptId: string) => void;
  onGenerateAssessments: () => void;
  generatedQuestions: GeneratedQuestion[];
  isGenerating: boolean;
  onSaveQuestions: () => void;
  isSaving: boolean;
}

export default function OCRResultDisplay({
  ocrResult,
  imageUrl,
  concepts,
  selectedConceptId,
  onConceptChange,
  onGenerateAssessments,
  generatedQuestions,
  isGenerating,
  onSaveQuestions,
  isSaving,
}: OCRResultDisplayProps) {
  const [showBlocks, setShowBlocks] = useState(false);

  if (!ocrResult) return null;

  const confidenceColor =
    ocrResult.confidence > 90 ? 'text-success' : ocrResult.confidence > 70 ? 'text-warning' : 'text-error';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="text_snippet" size={20} />
            Extracted Text
            <Badge variant={ocrResult.confidence > 90 ? 'success' : ocrResult.confidence > 70 ? 'warning' : 'destructive'}>
              {ocrResult.confidence.toFixed(1)}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {imageUrl && (
              <div className="relative rounded-lg overflow-hidden border border-outline-variant">
                <img src={imageUrl} alt="Scanned document" className="w-full object-contain max-h-80" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-surface/80"
                  onClick={() => setShowBlocks(!showBlocks)}
                >
                  <Icon name={showBlocks ? 'visibility_off' : 'visibility'} size={16} />
                  <span className="ml-1 text-label-sm">{showBlocks ? 'Hide' : 'Show'} blocks</span>
                </Button>
              </div>
            )}

            <div className="relative">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-surface-variant/30 rounded-lg p-4 max-h-96 overflow-y-auto border border-outline-variant">
                {ocrResult.text}
              </pre>
            </div>

            {showBlocks && ocrResult.blocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-label-sm font-semibold text-on-surface-variant">Text Blocks</p>
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {ocrResult.blocks.map((block, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-variant/20 border border-outline-variant">
                      <Badge variant="outline" className="shrink-0 mt-0.5">
                        {i + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{block.text}</p>
                        <p className="text-label-xs text-on-surface-variant mt-1">
                          Confidence: {block.confidence.toFixed(0)}% | Position: ({block.bbox.x}, {block.bbox.y})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-outline-variant">
              <div className="flex-1">
                <Select value={selectedConceptId} onValueChange={onConceptChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Map to concept..." />
                  </SelectTrigger>
                  <SelectContent>
                    {concepts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={onGenerateAssessments} disabled={!selectedConceptId || isGenerating}>
                <Icon name="auto_awesome" size={18} className="mr-1" />
                {isGenerating ? 'Generating...' : 'Generate Questions'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {generatedQuestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="quiz" size={20} />
                  Generated Questions ({generatedQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedQuestions.map((q, i) => (
                    <div key={q.id} className="p-4 rounded-lg border border-outline-variant bg-surface-variant/10">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-label-sm font-semibold">Q{i + 1}.</span>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-label-xs">{q.type.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="text-label-xs capitalize">{q.difficulty}</Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-2">{q.question}</p>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-1.5 mb-2">
                          {q.options.map((opt, j) => (
                            <div key={j} className={cn(
                              'px-3 py-1.5 rounded-lg text-xs border',
                              opt === q.correctAnswer
                                ? 'border-success bg-success-container/20 text-on-success-container'
                                : 'border-outline-variant bg-surface',
                            )}>
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-outline-variant/50">
                        <Icon name="lightbulb" size={14} className="text-warning mt-0.5 shrink-0" />
                        <p className="text-label-sm text-on-surface-variant">{q.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-outline-variant">
                  <Button onClick={onSaveQuestions} disabled={isSaving}>
                    <Icon name="save" size={18} className="mr-1" />
                    {isSaving ? 'Saving...' : 'Save to Question Bank'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
