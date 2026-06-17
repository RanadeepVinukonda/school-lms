import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import UploadProgressBanner from '@/components/textbook/UploadProgressBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useUploadStore } from '@/store/uploadStore';
import { getAllSubjects, getAllClasses } from '@/services/dataService';
import api from '@/services/api';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export default function TeacherTextbookUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClassId = searchParams.get('classId') ?? '';
  const querySubjectId = searchParams.get('subjectId') ?? '';

  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const myAssignments = await teacherClassSubjectService.getMyAssignments().then((res) => res.data);
      const [allSubjects, allClasses] = await Promise.all([getAllSubjects(), getAllClasses()]);
      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const classMap = new Map(allClasses.map((c) => [c.id, c]));
      return myAssignments.map((data) => {
        const subject = subjectMap.get(data.subjectId);
        const cls = classMap.get(data.classId);
        return {
          id: data.id,
          classId: data.classId,
          className: cls?.name ?? 'Unknown Class',
          subjectId: data.subjectId,
          subjectName: subject?.name ?? 'Unknown Subject',
        } as TeacherAssignment;
      });
    },
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];

  const selectedAssignment = assignmentList.find(
    (a) => a.id === selectedAssignmentId
  ) ?? (assignmentList.length === 1 ? assignmentList[0] : null);

  useEffect(() => {
    if (queryClassId && querySubjectId && assignmentList.length > 0) {
      const found = assignmentList.find(
        (a) => a.classId === queryClassId && a.subjectId === querySubjectId
      );
      if (found) {
        setSelectedAssignmentId(found.id);
      }
    } else if (queryClassId && assignmentList.length > 0) {
      const found = assignmentList.find((a) => a.classId === queryClassId);
      if (found) {
        setSelectedAssignmentId(found.id);
      }
    } else if (assignmentList.length === 1 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignmentList[0].id);
    }
  }, [assignmentList, selectedAssignmentId, queryClassId, querySubjectId]);

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
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    } else {
      toast.error('Please drop valid PDF files');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      setFiles((prev) => [...prev, ...selected]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadSingleFile = async (file: File, taskId: string, addLog: (msg: string) => void) => {
    addLog(`Requesting Cloudinary upload signature for ${file.name}...`);

    const sigRes = await api.get('/cloudinary/signature?folder=textbooks');
    const { signature, timestamp, apiKey, cloudName, folder } = sigRes.data.data;

    const cdFormData = new FormData();
    cdFormData.append('file', file);
    cdFormData.append('api_key', apiKey);
    cdFormData.append('timestamp', String(timestamp));
    cdFormData.append('signature', signature);
    cdFormData.append('folder', folder);

    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, progress: 40 } : t
      ),
    }));

    addLog(`Uploading ${file.name} directly to Cloudinary...`);

    const cdRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      cdFormData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 40);
            useUploadStore.setState((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === taskId ? { ...t, progress: pct } : t
              ),
            }));
          }
        },
      },
    );

    const { secure_url, public_id } = cdRes.data;
    addLog(`Cloudinary upload complete. Creating textbook record...`);

    const bodyFormData = new FormData();
    bodyFormData.append('cloudinaryUrl', secure_url);
    bodyFormData.append('cloudinaryPublicId', public_id);
    bodyFormData.append('subjectId', selectedAssignment!.subjectId);
    bodyFormData.append('classId', selectedAssignment!.classId);
    bodyFormData.append('title', file.name.replace('.pdf', ''));
    bodyFormData.append('description', file.name.replace('.pdf', ''));

    const res = await api.post('/textbooks', bodyFormData, {
      headers: { 'Content-Type': undefined },
    });

    addLog(`${file.name} uploaded successfully!`);
    useUploadStore.setState((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, progress: 100, stage: 'complete' } : t
      ),
    }));

    return res.data?.data?.id;
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !selectedAssignment) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const taskId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const addLog = (msg: string) => {
        useUploadStore.setState((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, log: [...t.log, msg] } : t
          ),
        }));
      };

      useUploadStore.setState((s) => ({
        tasks: [
          ...s.tasks,
          {
            id: taskId,
            file,
            subjectId: selectedAssignment.subjectId,
            subjectName: selectedAssignment.subjectName,
            classId: selectedAssignment.classId,
            stage: 'uploading',
            progress: 0,
            textbookId: null,
            log: [],
            error: null,
          },
        ],
      }));

      addLog(`Uploading ${file.name} (${i + 1}/${files.length})...`);

      try {
        await uploadSingleFile(file, taskId, addLog);
        toast.success(`${file.name} uploaded`);
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : `${file.name} failed. Please try again.`;
        useUploadStore.setState((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, stage: 'error', error: message, progress: 0 } : t
          ),
        }));
        toast.error(message);
      }
    }

    setIsUploading(false);
    setFiles([]);
    navigate(ROUTES.TEACHER_TEXTBOOKS);
  };

  if (assignmentsLoading) {
    return (
      <>
        <SEOHead title="Upload Textbook" description="Upload and process textbook PDFs" canonical="/teacher/textbooks/upload" />
        <div className="sm:p-6 p-4 max-w-3xl mx-auto space-y-6 pb-32">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-72 mt-2" />
          <Skeleton className="h-64 w-full mt-6" />
        </div>
      </>
    );
  }

  if (!assignmentsLoading && assignmentList.length === 0) {
    return (
      <>
        <SEOHead title="Upload Textbook" description="Upload and process textbook PDFs" canonical="/teacher/textbooks/upload" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-3xl mx-auto space-y-16 pb-32">
          <motion.div variants={cardStackReveal} custom={0}>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
              <Icon name="arrow_back" size={16} className="mr-1" />
              Back
            </Button>
            <h1 className="text-headline-sm">Upload Textbook</h1>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-12 text-center space-y-4">
                <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  You haven't been assigned to any class/subject yet. Contact your administrator.
                </p>
                <Button variant="outline" onClick={() => navigate(ROUTES.TEACHER_DASHBOARD)}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Upload Textbook" description="Upload and process textbook PDFs" canonical="/teacher/textbooks/upload" />
      <UploadProgressBanner />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-3xl mx-auto space-y-16 pb-32">
        <motion.div variants={cardStackReveal} custom={0}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <Icon name="arrow_back" size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-headline-sm">Upload Textbooks</h1>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-6">

              {queryClassId && querySubjectId && selectedAssignment ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">Class &amp; Subject</label>
                  <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-semibold">
                    {selectedAssignment.className} — {selectedAssignment.subjectName}
                  </div>
                </div>
              ) : assignmentList.length === 1 ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {assignmentList[0].subjectName}
                  </div>
                </div>
              ) : assignmentList.length > 1 ? (
                <div>
                  <label className="text-sm font-medium mb-2 block">Class &amp; Subject</label>
                  <select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select a class &amp; subject...</option>
                    {assignmentList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.className} — {a.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="space-y-2">
                  <Icon name="cloud_upload" size={40} className="text-muted-foreground mx-auto" />
                  <p className="font-medium">Drop PDFs here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Select multiple PDFs or a folder containing PDFs</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                        <Icon name="picture_as_pdf" size={18} className="text-red-500 shrink-0" />
                        <span className="text-sm truncate flex-1">{f.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="shrink-0">
                          <Icon name="close" size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSubmit}
                disabled={files.length === 0 || !selectedAssignment || isUploading}
              >
                {isUploading ? (
                  <>
                    <Icon name="hourglass_top" size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="cloud_upload" size={18} />
                    {files.length > 1 ? `Upload ${files.length} Textbooks` : 'Upload Textbook'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
