import { useState, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CameraCapture from '@/components/ocr/CameraCapture';
import { QuestionCard } from '@/components/ocr/QuestionCard';
import { scanImage, mapToConcept, pushQuiz } from '@/services/ocrService';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import type { OCRResult, GeneratedQuestion } from '@/types/ocr';

export default function StudentOCRPage() {
  const { _ } = useTranslation();
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [textInput, setTextInput] = useState('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [conceptName, setConceptName] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'capture' | 'scanning' | 'quiz'>('capture');
  const [selectedClassId, setSelectedClassId] = useState('');
  const { data: classes } = useClasses();
  const classList = classes ?? [];
  const generateQuiz = useCallback(async (text: string, count?: number) => {
    setIsProcessing(true);
    setError(null);
    setQuestions([]);
    try {
      const mappingResult = await mapToConcept(text, 'auto', count ?? questionCount);
      if (mappingResult) {
        setConceptName(mappingResult.conceptName || 'Detected Content');
        if (mappingResult.questions && mappingResult.questions.length > 0) setQuestions(mappingResult.questions);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate quiz. Please try again.');
    }
    setIsProcessing(false);
    setStep('quiz');
  }, [questionCount]);
  const processOcrResult = useCallback(async (file: File) => {
    setStep('scanning');
    setError(null);
    try {
      const result = await scanImage(file);
      setOcrResult(result);
      await generateQuiz(result.text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not process the image. Please try again.');
      setStep('capture');
    }
  }, [generateQuiz]);
  const handleCapture = useCallback((blob: Blob) => {
    const file = new File([blob], 'page.jpg', { type: 'image/jpeg' });
    processOcrResult(file);
  }, [processOcrResult]);
  const handleFileUpload = useCallback((file: File) => {
    processOcrResult(file);
  }, [processOcrResult]);
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    setOcrResult({ text: textInput, confidence: 100, blocks: [] });
    setStep('scanning');
    setError(null);
    mapToConcept(textInput, 'auto', questionCount)
      .then((result) => {
        if (result) {
          setConceptName(result.conceptName || 'Input Text');
          if (result.questions && result.questions.length > 0) setQuestions(result.questions);
        }
        setStep('quiz');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not generate quiz.');
        setStep('capture');
      })
      .finally(() => setIsProcessing(false));
  }, [textInput, questionCount]);
  const handleEditQuestion = useCallback((id: string, field: string, value: string | string[]) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }, []);
  const handleDeleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);
  const handlePushQuiz = async () => {
    if (!selectedClassId || questions.length === 0) return;
    try {
      await pushQuiz({ questions, conceptName }, selectedClassId);
      toast.success('Quiz pushed to class successfully!');
      reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to push quiz');
    }
  };

  const reset = useCallback(() => {
    setOcrResult(null);
    setQuestions([]);
    setConceptName('');
    setSelectedClassId('');
    setError(null);
    setStep('capture');
  }, []);
  return (
    <>
      <SEOHead title={_('Scan Textbook Page')} description={_('Scan textbook pages and take quick quizzes')} />
      <motion.div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-title-lg font-bold">{_('Scan a Page')}</h1>
          <p className="text-on-surface-variant mt-1">{_('Capture a textbook page or paste text and get a quick quiz instantly')}</p>
        </div>
        <AnimatePresence mode="wait">
          {step === 'capture' && (
            <motion.div key="capture" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg w-fit max-w-full mb-4">
                <button
                  onClick={() => setMode('image')}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm whitespace-nowrap font-medium transition-colors ${mode === 'image' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Icon name="camera_alt" size={16} className="mr-1.5 inline" />
                  Image Mode
                </button>
                <button
                  onClick={() => setMode('text')}
                  className={`px-3 sm:px-4 py-2 rounded-md text-sm whitespace-nowrap font-medium transition-colors ${mode === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Icon name="text_fields" size={16} className="mr-1.5 inline" />
                  Text Mode
                </button>
              </div>
              {mode === 'image' && <CameraCapture onCapture={handleCapture} onFileUpload={handleFileUpload} />}
              {mode === 'text' && (
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <Textarea
                      placeholder={_('Paste or type your study material here...')}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={8}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-label-xs text-muted-foreground">{_('Questions:')}</label>
                        <select
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {[3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <Button onClick={handleTextSubmit} disabled={!textInput.trim() || isProcessing}>
                        <Icon name="auto_awesome" size={16} className="mr-1" />
                        Generate Quiz from Text
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card><CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Icon name="document_scanner" size={48} className="text-primary" />
                  <Progress className="w-64" />
                  <p className="text-sm text-on-surface-variant">{isProcessing ? _('Generating quiz questions...') : _('Scanning and extracting text...')}</p>
                </div>
              </CardContent></Card>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="auto_stories" size={20} />
                    {conceptName || _('Detected Content')}
                    <Badge variant="info">{_('Auto-detected')}</Badge>
                  </CardTitle>
                  {ocrResult && (
                    <CardDescription>
                      {_('Confidence')}: {ocrResult.confidence.toFixed(0)}% | {ocrResult.text.length} {_('characters extracted')}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-label-xs text-muted-foreground">{_('Questions:')}</label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        disabled={isProcessing}
                      >
                        {[3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <Button size="sm" onClick={() => generateQuiz(ocrResult?.text || '')} disabled={isProcessing}>
                      <Icon name="auto_awesome" size={16} className="mr-1" />
                      {isProcessing ? _('Generating...') : _('Generate Quiz')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={reset}>
                      <Icon name="refresh" size={16} className="mr-1" />
                      {_('Scan Another Page')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {questions.length > 0 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon name="quiz" size={20} />
                        {_('Quick Quiz')} ({questions.length} {_('questions')})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {questions.map((q, i) => (
                          <QuestionCard key={q.id} q={q} index={i} onEdit={handleEditQuestion} onDelete={handleDeleteQuestion} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon name="send" size={20} />
                        {_('Push to Class')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-label-xs text-muted-foreground">{_('Select a class')}</label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder={_('Choose a class...')} />
                          </SelectTrigger>
                          <SelectContent>
                            {classList.map((cls: any) => (
                              <SelectItem key={cls.id} value={cls.id}>{formatClassName(cls)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handlePushQuiz} disabled={!selectedClassId || questions.length === 0} className="w-full">
                        <Icon name="send" size={16} className="mr-1" />
                        Push to Quiz
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {questions.length === 0 && ocrResult && !isProcessing && (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center gap-3">
                    <Icon name="auto_stories" size={36} className="text-muted-foreground/50" />
                    <p className="text-body-sm text-muted-foreground">{_('Click "Generate Quiz" to create questions from the scanned text.')}</p>
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
              <Button variant="outline" size="sm" onClick={reset}>{_('Try Again')}</Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
