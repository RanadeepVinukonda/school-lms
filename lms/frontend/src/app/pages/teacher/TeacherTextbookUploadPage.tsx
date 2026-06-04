import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pageTransition } from '@/lib/motion';
import { extractTextFromPDF } from '@/lib/pdfUtils';
import { extractChapters, generateConceptContent, generateQuestionBank } from '@/services/aiService';
import { searchVideosForConcept } from '@/services/youtubeService';
import { createTextbook, saveChapters } from '@/services/textbookService';
import { mockSubjects } from '@/lib/mockData';
import type { Chapter, Concept, CachedVideo, GeneratedQuestion, GeneratedAssignment } from '@/types/textbook';

type ProcessingStage = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'generating' | 'videos' | 'questions' | 'saving' | 'complete' | 'error';

const stageLabels: Record<ProcessingStage, string> = {
  idle: 'Ready',
  uploading: 'Uploading PDF...',
  extracting: 'Extracting text from PDF...',
  analyzing: 'AI is analyzing structure...',
  generating: 'Generating concept content...',
  videos: 'Searching for educational videos...',
  questions: 'Generating question banks...',
  saving: 'Saving to database...',
  complete: 'Complete!',
  error: 'Error',
};

export default function TeacherTextbookUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState(0);
  const [textbookId, setTextbookId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
    } else {
      toast.error('Please upload a PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const subjectName = subjectId
    ? mockSubjects.find((s) => s.id === subjectId)?.name || customSubject
    : customSubject;

  const handleProcess = async () => {
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }
    if (!subjectId && !customSubject) {
      toast.error('Please select or enter a subject');
      return;
    }

    try {
      setStage('uploading');
      setProgress(5);
      addLog('Starting textbook processing...');

      const initialTextbook = {
        subjectId: subjectId || 'custom',
        title: file.name.replace('.pdf', ''),
        chapters: [],
        status: 'processing' as const,
        processingProgress: 0,
        processingStage: 'Starting...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const id = await createTextbook(initialTextbook);
      setTextbookId(id);
      addLog(`Textbook created with ID: ${id}`);

      setStage('extracting');
      setProgress(15);
      addLog('Extracting text from PDF...');
      const text = await extractTextFromPDF(file);
      addLog(`Extracted ${text.length} characters from PDF`);

      if (text.length < 50) {
        throw new Error('Could not extract enough text from the PDF. The file may be scanned images or empty.');
      }

      setStage('analyzing');
      setProgress(25);
      addLog('AI is analyzing textbook structure...');
      const structure = await extractChapters(text, subjectName);
      addLog(`Found ${structure.chapters.length} chapters`);

      const chapters: Chapter[] = [];

      for (let ci = 0; ci < structure.chapters.length; ci++) {
        const ch = structure.chapters[ci];
        const concepts: Concept[] = [];

        for (let coi = 0; coi < ch.concepts.length; coi++) {
          const cp = ch.concepts[coi];
          const conceptProgress = ((ci * ch.concepts.length + coi + 1) / (structure.chapters.reduce((s, c) => s + c.concepts.length, 0))) * 100;
          const stagePct = 25 + (conceptProgress * 0.5);
          setProgress(Math.min(Math.round(stagePct), 75));
          setStage('generating');
          addLog(`Generating content for concept: ${cp.title}`);

          let content;
          try {
            content = await generateConceptContent(cp.title, ch.title, subjectName, text);
          } catch {
            content = {
              summary: cp.description || `Study of ${cp.title}`,
              notes: `Detailed notes for ${cp.title}. This concept covers key principles and applications.`,
              learningObjectives: [`Understand ${cp.title}`, `Apply ${cp.title} concepts`, `Analyze problems involving ${cp.title}`],
              keywords: [cp.title.toLowerCase().replace(/\s+/g, '_')],
              difficulty: 'intermediate' as const,
              prerequisites: [],
              estimatedMinutes: 15,
            };
          }

          setStage('videos');
          let videos: CachedVideo[] = [];
          try {
            videos = await searchVideosForConcept(subjectName, ch.title, cp.title);
            addLog(`Found ${videos.length} videos for: ${cp.title}`);
          } catch {
            addLog('Video search skipped');
          }

          setStage('questions');
          let questionBank: GeneratedQuestion[] = [];
          try {
            const qb = await generateQuestionBank(cp.title, ch.title, subjectName);
            const allQuestions: GeneratedQuestion[] = [];

            [...(qb.easy || [])].forEach((q, i) => {
              allQuestions.push({
                id: `${cp.title.replace(/\s+/g, '_')}_easy_${i}`,
                type: q.type as GeneratedQuestion['type'],
                difficulty: 'easy',
                category: 'recall',
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: 1,
              });
            });

            [...(qb.medium || [])].forEach((q, i) => {
              allQuestions.push({
                id: `${cp.title.replace(/\s+/g, '_')}_medium_${i}`,
                type: q.type as GeneratedQuestion['type'],
                difficulty: 'medium',
                category: 'application',
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: 2,
              });
            });

            [...(qb.hard || [])].forEach((q, i) => {
              allQuestions.push({
                id: `${cp.title.replace(/\s+/g, '_')}_hard_${i}`,
                type: q.type as GeneratedQuestion['type'],
                difficulty: 'hard',
                category: 'critical_thinking',
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: 3,
              });
            });

            [...(qb.application || [])].forEach((q, i) => {
              allQuestions.push({
                id: `${cp.title.replace(/\s+/g, '_')}_app_${i}`,
                type: q.type as GeneratedQuestion['type'],
                difficulty: 'medium',
                category: 'application',
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                points: 2,
              });
            });

            questionBank = allQuestions;
            addLog(`Generated ${allQuestions.length} questions for: ${cp.title}`);
          } catch {
            addLog('Question generation skipped for: ' + cp.title);
          }

          concepts.push({
            id: `concept_${id}_ch${ci}_co${coi}`,
            chapterId: `ch_${id}_${ci}`,
            textbookId: id,
            title: cp.title,
            summary: content.summary,
            notes: content.notes,
            learningObjectives: content.learningObjectives,
            keywords: content.keywords,
            difficulty: content.difficulty,
            prerequisites: content.prerequisites,
            estimatedMinutes: content.estimatedMinutes,
            videos,
            questionBank,
            assignments: [],
            order: coi,
          });
        }

        chapters.push({
          id: `ch_${id}_${ci}`,
          textbookId: id,
          title: ch.title,
          order: ci,
          description: ch.description,
          concepts,
        });
      }

      setStage('saving');
      setProgress(90);
      addLog('Saving all content to database...');
      await saveChapters(id, chapters);
      setProgress(100);
      setStage('complete');
      addLog('Textbook processing complete!');

      toast.success('Textbook processed successfully!');
      setTimeout(() => navigate(`/teacher/textbooks/${id}`), 2000);
    } catch (err) {
      setStage('error');
      addLog(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(err instanceof Error ? err.message : 'Processing failed');
    }
  };

  return (
    <>
      <SEOHead title="Upload Textbook" description="Upload a PDF textbook for AI-powered content generation" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-3xl mx-auto space-y-6 pb-20">
        <div>
          <h1 className="text-headline-sm font-bold">Upload Textbook</h1>
          <p className="text-sm text-muted-foreground">Upload a PDF and AI will automatically extract chapters, concepts, generate questions, and find videos.</p>
        </div>

        {stage === 'idle' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Icon name="upload_file" size={48} className="text-muted-foreground/50 mb-4 mx-auto" />
                  {file ? (
                    <div>
                      <p className="font-medium text-lg">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-lg">Drop your textbook PDF here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        <div className="flex items-center gap-2">
                          <Icon name="add" size={14} />
                          Custom subject...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {subjectId === '__custom__' && (
                    <Input
                      placeholder="Enter subject name"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleProcess}
                  disabled={!file || (!subjectId && !customSubject)}
                >
                  <Icon name="auto_awesome" size={18} className="mr-2" />
                  Process with AI
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {stage !== 'idle' && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                {stage === 'complete' ? (
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Icon name="check_circle" size={22} className="text-success" />
                  </div>
                ) : stage === 'error' ? (
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Icon name="error" size={22} className="text-destructive" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{stageLabels[stage]}</p>
                  <p className="text-sm text-muted-foreground">{progress}%</p>
                </div>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="bg-muted/50 rounded-xl p-4 max-h-48 overflow-y-auto space-y-1">
                {log.map((msg, i) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">
                    {msg}
                  </p>
                ))}
              </div>

              {stage === 'complete' && (
                <Button className="w-full" onClick={() => navigate(`/teacher/textbooks/${textbookId}`)}>
                  <Icon name="visibility" size={16} className="mr-2" />
                  View Textbook
                </Button>
              )}

              {stage === 'error' && (
                <Button variant="outline" className="w-full" onClick={() => {
                  setStage('idle');
                  setProgress(0);
                  setLog([]);
                }}>
                  <Icon name="refresh" size={16} className="mr-2" />
                  Try Again
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
