import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTextbooks } from '@/services/textbookService';
import CameraCapture from '@/components/ocr/CameraCapture';
import OCRResultDisplay from '@/components/ocr/OCRResultDisplay';
import { scanImage, scanImageBase64, mapToConcept, getConceptsForTextbook } from '@/services/ocrService';
import type { OCRResult, GeneratedQuestion, ConceptOption } from '@/types/ocr';

export default function TeacherOCRPage() {
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

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
    setIsScanning(true);
    setOcrError(null);
    setGeneratedQuestions([]);
    try {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const result = await scanImage(file);
      setOcrResult(result);
    } catch {
      setOcrError('Failed to scan image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsScanning(true);
    setOcrError(null);
    setGeneratedQuestions([]);
    try {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      const result = await scanImage(file);
      setOcrResult(result);
    } catch {
      setOcrError('Failed to scan image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleGenerateAssessments = useCallback(async () => {
    if (!ocrResult?.text || !selectedConceptId) return;
    setIsGenerating(true);
    try {
      const mappingResult = await mapToConcept(ocrResult.text, selectedTextbookId);
      if (mappingResult.questions && mappingResult.questions.length > 0) {
        setGeneratedQuestions(mappingResult.questions);
      }
    } catch {
      setOcrError('Failed to generate assessments. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [ocrResult, selectedConceptId, selectedTextbookId]);

  const handleSaveQuestions = useCallback(async () => {
    if (!generatedQuestions.length) return;
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSaving(false);
    } catch {
      setIsSaving(false);
    }
  }, [generatedQuestions]);

  return (
    <>
      <SEOHead title="OCR Scanner" description="Scan textbook pages and generate assessments" />
      <motion.div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-title-lg font-bold">OCR Textbook Scanner</h1>
          <p className="text-on-surface-variant mt-1">Capture or upload textbook pages to extract text and generate assessments</p>
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

        <CameraCapture onCapture={handleCapture} onFileUpload={handleFileUpload} isLoading={isScanning} />

        {isScanning && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Icon name="hourglass_top" size={32} className="animate-spin text-primary" />
                <p className="text-sm text-on-surface-variant">Scanning image and extracting text...</p>
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

        {ocrResult && (
          <OCRResultDisplay
            ocrResult={ocrResult}
            imageUrl={imageUrl}
            concepts={concepts}
            selectedConceptId={selectedConceptId}
            onConceptChange={setSelectedConceptId}
            onGenerateAssessments={handleGenerateAssessments}
            generatedQuestions={generatedQuestions}
            isGenerating={isGenerating}
            onSaveQuestions={handleSaveQuestions}
            isSaving={isSaving}
          />
        )}
      </motion.div>
    </>
  );
}
