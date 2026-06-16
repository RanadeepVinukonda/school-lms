import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTextbooks } from '@/services/textbookService';
import CameraCapture from '@/components/ocr/CameraCapture';
import OCRResultDisplay from '@/components/ocr/OCRResultDisplay';
import { scanMultipleImages, mapToConcept, getConceptsForTextbook } from '@/services/ocrService';
import type { OCRResult, GeneratedQuestion, ConceptOption } from '@/types/ocr';

export default function TeacherOCRPage() {
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [generatedAssignment, setGeneratedAssignment] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [genType, setGenType] = useState<'quiz' | 'assignment'>('quiz');

  const { data: textbooks } = useQuery({
    queryKey: ['textbooks'],
    queryFn: getAllTextbooks,
  });

  const { data: concepts = [] } = useQuery({
    queryKey: ['ocr-concepts', selectedTextbookId],
    queryFn: () => getConceptsForTextbook(selectedTextbookId),
    enabled: !!selectedTextbookId,
  });

  const handleCapture = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setImageUrls((prev) => [...prev, url]);
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setImageUrls((prev) => [...prev, ...urls]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleScanAll = useCallback(async () => {
    if (imageUrls.length === 0) return;
    setIsScanning(true);
    setOcrError(null);
    setGeneratedQuestions([]);
    setGeneratedAssignment(null);
    try {
      // Convert blob URLs back to files
      const files = await Promise.all(imageUrls.map(async (url, i) => {
        const blob = await fetch(url).then((r) => r.blob());
        return new File([blob], `page-${i + 1}.jpg`, { type: 'image/jpeg' });
      }));
      const result = await scanMultipleImages(files);
      setOcrResult({ text: result.text, confidence: result.confidence, blocks: [] });
    } catch (err: any) {
      setOcrError(err?.message || 'Failed to scan images. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [imageUrls]);

  const handleGenerate = useCallback(async () => {
    if (!ocrResult?.text) return;
    setIsGenerating(true);
    setOcrError(null);
    try {
      const mappingResult = await mapToConcept(ocrResult.text, selectedTextbookId || 'auto', 5, genType);
      if (genType === 'assignment' && mappingResult.assignment) {
        setGeneratedAssignment(mappingResult.assignment);
        setGeneratedQuestions([]);
      } else if (mappingResult.questions && mappingResult.questions.length > 0) {
        setGeneratedQuestions(mappingResult.questions);
        setGeneratedAssignment(null);
      }
    } catch (err: any) {
      setOcrError(err?.message || 'Failed to generate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [ocrResult, selectedTextbookId, genType]);

  const handleSave = useCallback(async () => {
    if (!generatedQuestions.length && !generatedAssignment) return;
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSaving(false);
    } catch {
      setIsSaving(false);
    }
  }, [generatedQuestions, generatedAssignment]);

  const resetAll = useCallback(() => {
    imageUrls.forEach((u) => URL.revokeObjectURL(u));
    setImageUrls([]);
    setOcrResult(null);
    setGeneratedQuestions([]);
    setGeneratedAssignment(null);
    setOcrError(null);
  }, [imageUrls]);

  return (
    <>
      <SEOHead title="OCR Scanner" description="Scan textbook pages and generate assessments" />
      <motion.div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-title-lg font-bold">OCR Textbook Scanner</h1>
          <p className="text-on-surface-variant mt-1">Capture or upload multiple textbook pages to extract text and generate assessments</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="menu_book" size={20} />
              Select Textbook
            </CardTitle>
            <CardDescription>Choose the textbook you want to map the scanned content to</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTextbookId} onValueChange={setSelectedTextbookId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a textbook..." />
              </SelectTrigger>
              <SelectContent>
                {textbooks?.map((tb) => (
                  <SelectItem key={tb.id} value={tb.id}>
                    {tb.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <CameraCapture onCapture={handleCapture} onFileUpload={(f) => handleFileUpload([f])} isLoading={isScanning} />

        {imageUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-title-sm">
                <Icon name="image" size={18} />
                Uploaded Pages ({imageUrls.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-border/60">
                    <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-label-xs px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={handleScanAll} loading={isScanning} disabled={isScanning}>
                  <Icon name="document_scanner" size={16} className="mr-1.5" />
                  Scan All Pages
                </Button>
                <Button variant="outline" onClick={resetAll}>
                  <Icon name="refresh" size={16} className="mr-1.5" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isScanning && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                <Icon name="hourglass_top" size={32} className="animate-spin text-primary" />
                <p className="text-sm text-on-surface-variant">Scanning {imageUrls.length} page(s) and extracting text...</p>
                <Progress value={45} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {ocrError && (
          <Card className="border-error">
            <CardContent className="flex items-center gap-3 py-4">
              <Icon name="error" size={20} className="text-error shrink-0" />
              <p className="text-sm text-error">{ocrError}</p>
            </CardContent>
          </Card>
        )}

        {ocrResult && !isScanning && (
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Extracted Text</CardTitle>
              <CardDescription>
                Confidence: {ocrResult.confidence.toFixed(0)}% | {ocrResult.text.length} characters from {imageUrls.length} page(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-60 overflow-y-auto text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">{ocrResult.text}</pre>
            </CardContent>
          </Card>
        )}

        {ocrResult && !isScanning && (
          <Card>
            <CardHeader>
              <CardTitle className="text-title-sm">Generate Assessment</CardTitle>
              <CardDescription>Choose assessment type and generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={genType} onValueChange={(v: 'quiz' | 'assignment') => setGenType(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerate} loading={isGenerating}>
                  <Icon name="auto_awesome" size={16} className="mr-1.5" />
                  Generate {genType === 'quiz' ? 'Quiz' : 'Assignment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {generatedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="quiz" size={20} />
                Generated Quiz ({generatedQuestions.length} questions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedQuestions.map((q, i) => (
                  <div key={q.id} className="p-4 rounded-lg border border-outline-variant">
                    <p className="text-sm font-semibold mb-2">Q{i + 1}. {q.question}</p>
                    {q.options && (
                      <div className="space-y-1.5 mb-2">
                        {q.options.map((opt, j) => (
                          <div key={j} className={`px-3 py-2 rounded-lg border text-sm ${opt === q.correctAnswer ? 'border-success bg-success/5' : 'border-border'}`}>
                            {opt} {opt === q.correctAnswer && <span className="text-success text-xs ml-1">✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Difficulty: {q.difficulty} | Type: {q.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                  </div>
                ))}
              </div>
              <Button className="mt-4" onClick={handleSave} loading={isSaving}>
                <Icon name="save" size={16} className="mr-1.5" />
                Save to Question Bank
              </Button>
            </CardContent>
          </Card>
        )}

        {generatedAssignment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="assignment" size={20} />
                {generatedAssignment.title || 'Generated Assignment'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedAssignment.description && (
                <p className="text-sm text-muted-foreground">{generatedAssignment.description}</p>
              )}
              {generatedAssignment.instructions && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-semibold mb-1">Instructions:</p>
                  <p className="text-sm">{generatedAssignment.instructions}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold mb-2">Questions ({generatedAssignment.questions?.length || 0})</p>
                <ol className="list-decimal list-inside space-y-2">
                  {(generatedAssignment.questions || []).map((q: string, i: number) => (
                    <li key={i} className="text-sm">{q}</li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold">Total Points: {generatedAssignment.totalPoints || 0}</span>
              </div>
              {generatedAssignment.rubric && (
                <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
                  <p className="text-xs font-semibold mb-1">Rubric:</p>
                  <p className="text-sm">{generatedAssignment.rubric}</p>
                </div>
              )}
              <Button className="mt-2" onClick={handleSave} loading={isSaving}>
                <Icon name="save" size={16} className="mr-1.5" />
                Save Assignment
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
