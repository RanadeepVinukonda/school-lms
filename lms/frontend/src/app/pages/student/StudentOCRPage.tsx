import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Progress } from '@/components/ui/progress';
import CameraCapture from '@/components/ocr/CameraCapture';
import { scanImage, mapToConcept } from '@/services/ocrService';
import type { OCRResult, GeneratedQuestion } from '@/types/ocr';

function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="p-4 rounded-lg border border-outline-variant">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold">Q{index + 1}. {q.question}</span>
        <Badge variant="secondary" className="text-label-xs shrink-0">{q.type.replace('_', ' ')}</Badge>
      </div>
      {q.options && (
        <div className="space-y-1.5 mt-2">
          {q.options.map((opt, j) => (
            <div key={j} className="px-3 py-2 rounded-lg border border-outline-variant text-sm">{opt}</div>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border">
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="flex items-center gap-1.5 text-label-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Icon name={showAnswer ? 'visibility_off' : 'visibility'} size={14} />
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>
        {showAnswer && (
          <div className="mt-2 p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-label-xs font-semibold text-success mb-1">Correct Answer:</p>
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

export default function StudentOCRPage() {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [conceptName, setConceptName] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'capture' | 'scanning' | 'result' | 'quiz'>('capture');

  const generateQuiz = useCallback(async () => {
    if (!ocrResult) return;
    setIsProcessing(true);
    setError(null);
    setQuestions([]);
    try {
      const mappingResult = await mapToConcept(ocrResult.text, 'auto', questionCount);
      if (mappingResult) {
        setConceptName(mappingResult.conceptName || 'Detected Content');
        if (mappingResult.questions?.length > 0) {
          setQuestions(mappingResult.questions);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Could not generate quiz. Please try again.');
    }
    setIsProcessing(false);
  }, [ocrResult, questionCount]);

  const handleCapture = useCallback(async (blob: Blob) => {
    setIsScanning(true);
    setStep('scanning');
    setError(null);
    try {
      const file = new File([blob], 'page.jpg', { type: 'image/jpeg' });
      const result = await scanImage(file);
      setOcrResult(result);
      setIsScanning(false);
      setStep('quiz');
    } catch (err: any) {
      setError(err?.message || 'Could not process the image. Please try again.');
      setIsScanning(false);
      setStep('capture');
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsScanning(true);
    setStep('scanning');
    setError(null);
    try {
      const result = await scanImage(file);
      setOcrResult(result);
      setIsScanning(false);
      setStep('quiz');
    } catch (err: any) {
      setError(err?.message || 'Could not process the image. Please try again.');
      setIsScanning(false);
      setStep('capture');
    }
  }, []);

  const reset = useCallback(() => {
    setOcrResult(null);
    setQuestions([]);
    setConceptName('');
    setError(null);
    setStep('capture');
  }, []);

  return (
    <>
      <SEOHead title="Scan Textbook Page" description="Scan textbook pages and take quick quizzes" />
      <motion.div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-title-lg font-bold">Scan a Page</h1>
          <p className="text-on-surface-variant mt-1">Capture a textbook page and get a quick quiz instantly</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'capture' && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CameraCapture onCapture={handleCapture} onFileUpload={handleFileUpload} />
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-4">
                    <Icon name="document_scanner" size={48} className="text-primary" />
                    <Progress className="w-64" />
                    <p className="text-sm text-on-surface-variant">
                      {isProcessing ? 'Generating quiz questions...' : 'Scanning and extracting text...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="auto_stories" size={20} />
                    {conceptName || 'Detected Content'}
                    <Badge variant="info">Auto-detected</Badge>
                  </CardTitle>
                  {ocrResult && (
                    <CardDescription>
                      Confidence: {ocrResult.confidence.toFixed(0)}% | {ocrResult.text.length} characters extracted
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-label-xs text-muted-foreground">Questions:</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        disabled={isProcessing}
                      >
                        {[3, 5, 10, 15, 20].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <Button size="sm" onClick={generateQuiz} disabled={isProcessing}>
                      <Icon name="auto_awesome" size={16} className="mr-1" />
                      {isProcessing ? 'Generating...' : 'Generate Quiz'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={reset}>
                      <Icon name="refresh" size={16} className="mr-1" />
                      Scan Another Page
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {questions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="quiz" size={20} />
                      Quick Quiz ({questions.length} questions)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {questions.map((q, i) => (
                        <QuestionCard key={q.id} q={q} index={i} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : ocrResult && !isProcessing && (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center gap-3">
                    <Icon name="auto_stories" size={36} className="text-muted-foreground/50" />
                    <p className="text-body-sm text-muted-foreground">Click "Generate Quiz" to create questions from the scanned text.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <Card className="border-error">
            <CardContent className="flex items-center gap-3 py-4">
              <Icon name="error" size={20} className="text-error shrink-0" />
              <p className="text-sm text-error flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={reset}>Try Again</Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
