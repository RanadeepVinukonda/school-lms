import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

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
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
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

  useEffect(() => {
    if (file && !title) {
      setTitle(file.name.replace('.pdf', ''));
    }
  }, [file, title]);

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

  const handleSubmit = async () => {
    if (!file || !selectedAssignment) return;

    setIsUploading(true);

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

    addLog('Uploading textbook to server...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', selectedAssignment.subjectId);
      formData.append('classId', selectedAssignment.classId);
      formData.append('title', title || file.name.replace('.pdf', ''));
      if (description) formData.append('description', description);

      useUploadStore.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, progress: 40 } : t
        ),
      }));

      const res = await api.post('/textbooks', formData, {
        headers: { 'Content-Type': undefined },
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
      });

      addLog('Textbook uploaded successfully!');
      useUploadStore.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, progress: 100, stage: 'complete' } : t
        ),
      }));

      toast.success('Textbook uploaded successfully!');
      const textbookId = res.data?.data?.id;
      if (textbookId) {
        navigate(ROUTES.TEACHER_TEXTBOOK(textbookId));
      } else {
        navigate(ROUTES.TEACHER_TEXTBOOKS);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Upload failed. Please try again.';
      useUploadStore.setState((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId ? { ...t, stage: 'error', error: message, progress: 0 } : t
        ),
      }));
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (assignmentsLoading) {
    return (
      <>
        <SEOHead title="Upload Textbook" description="Upload and process a textbook PDF" canonical="/teacher/textbooks/upload" />
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
        <SEOHead title="Upload Textbook" description="Upload and process a textbook PDF" canonical="/teacher/textbooks/upload" />
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
      <SEOHead title="Upload Textbook" description="Upload and process a textbook PDF" canonical="/teacher/textbooks/upload" />
      <UploadProgressBanner />
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
            <CardContent className="p-5 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter textbook title"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the textbook"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

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
                onClick={handleSubmit}
                disabled={!file || !selectedAssignment || isUploading}
              >
                {isUploading ? (
                  <>
                    <Icon name="hourglass_top" size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="cloud_upload" size={18} />
                    Upload Textbook
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
