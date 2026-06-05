import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { pageTransition, listItem } from '@/lib/motion';
import { useUploadStore, stageLabel } from '@/store/uploadStore';
import type { UploadStage } from '@/store/uploadStore';

const stageIcons: Record<UploadStage, string> = {
  idle: 'hourglass_empty',
  uploading: 'cloud_upload',
  extracting: 'description',
  analyzing: 'psychology',
  generating: 'auto_awesome',
  videos: 'subscriptions',
  questions: 'quiz',
  saving: 'save',
  complete: 'check_circle',
  error: 'error',
};
const stageColor: Record<UploadStage, string> = {
  idle: 'text-muted-foreground',
  uploading: 'text-blue-500',
  extracting: 'text-violet-500',
  analyzing: 'text-purple-500',
  generating: 'text-pink-500',
  videos: 'text-rose-500',
  questions: 'text-orange-500',
  saving: 'text-amber-500',
  complete: 'text-green-500',
  error: 'text-red-500',
};

const subjects = [
  { id: 'math', name: 'Mathematics' },
  { id: 'physics', name: 'Physics' },
  { id: 'chemistry', name: 'Chemistry' },
  { id: 'biology', name: 'Biology' },
  { id: 'history', name: 'History' },
  { id: 'literature', name: 'Literature' },
  { id: 'cs', name: 'Computer Science' },
  { id: 'custom', name: 'Custom' },
];

export default function TeacherTextbookUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState('math');
  const [dragActive, setDragActive] = useState(false);

  const tasks = useUploadStore((s) => s.tasks);
  const startUpload = useUploadStore((s) => s.startUpload);

  const activeTask = tasks[tasks.length - 1] ?? null;
  const isProcessing = activeTask && !(['complete', 'error', 'idle'] as UploadStage[]).includes(activeTask.stage);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    const subj = subjects.find((s) => s.id === subjectId);
    startUpload(file, subjectId, subj?.name ?? 'Custom');
  };

  return (
    <>
      <SEOHead title="Upload Textbook" description="Upload and process a textbook PDF" canonical="/teacher/textbooks/upload" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-3xl mx-auto space-y-6 pb-20">
        <motion.div variants={listItem}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <Icon name="arrow_back" size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-headline-sm">Upload Textbook</h1>
          <p className="text-sm text-muted-foreground">Upload a PDF and let AI process it into interactive lessons</p>
        </motion.div>

        <motion.div variants={listItem}>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {subjects.map((subj) => (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => setSubjectId(subj.id)}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                        subjectId === subj.id
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      {subj.name}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                {file ? (
                  <div className="space-y-2">
                    <Icon name="picture_as_pdf" size={40} className="text-red-500 mx-auto" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      <Icon name="close" size={14} className="mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Icon name="cloud_upload" size={40} className="text-muted-foreground mx-auto" />
                    <p className="font-medium">Drop your PDF here or click to browse</p>
                    <p className="text-xs text-muted-foreground">Supports .pdf files up to 50MB</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleProcess}
                disabled={!file || !!isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Icon name="hourglass_top" size={18} className="animate-spin" />
                    Processing... ({activeTask?.progress}%)
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" size={18} />
                    Process with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {activeTask && (
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name={stageIcons[activeTask.stage] || 'hourglass_empty'} size={18} className={stageColor[activeTask.stage]} />
                  {activeTask.file.name}
                  <Badge variant="outline" className="text-[10px] ml-auto">{activeTask.progress}%</Badge>
                </CardTitle>
                <CardDescription>{stageLabel(activeTask.stage)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${activeTask.stage === 'error' ? 'bg-red-500' : 'bg-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${activeTask.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                <div className="h-32 overflow-y-auto bg-muted/30 rounded-lg p-3">
                  {activeTask.log.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Waiting to start...</p>
                  ) : (
                    activeTask.log.map((msg, i) => (
                      <p key={i} className="text-xs text-muted-foreground font-mono leading-5">
                        <span className="text-primary/60">{'>'}</span> {msg}
                      </p>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  {activeTask.stage === 'complete' && activeTask.textbookId && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/teacher/textbooks/${activeTask.textbookId}`)}
                    >
                      <Icon name="edit" size={14} className="mr-1" />
                      Edit Textbook
                    </Button>
                  )}
                  {activeTask.stage === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => useUploadStore.getState().retryTask(activeTask.id)}
                    >
                      <Icon name="refresh" size={14} className="mr-1" />
                      Retry
                    </Button>
                  )}
                  {(activeTask.stage === 'complete' || activeTask.stage === 'error') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => useUploadStore.getState().removeTask(activeTask.id)}
                    >
                      <Icon name="close" size={14} className="mr-1" />
                      Dismiss
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
