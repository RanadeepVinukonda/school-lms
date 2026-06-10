import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { pageTransition, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export default function TeacherTextbookUploadPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];

  const selectedAssignment = assignmentList.find((a) => a.classId === selectedClassId);

  // Auto-select if the teacher has only one assignment
  useEffect(() => {
    if (assignmentList.length === 1 && !selectedClassId) {
      setSelectedClassId(assignmentList[0].classId);
    }
  }, [assignmentList, selectedClassId]);

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
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', selectedAssignment.subjectId);
      formData.append('classId', selectedAssignment.classId);
      formData.append('title', file.name.replace('.pdf', ''));

      const res = await api.post('/textbooks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Loading state
  if (assignmentsLoading) {
    return (
      <>
        <SEOHead title="Upload Textbook" description="Upload and process a textbook PDF" canonical="/teacher/textbooks/upload" />
        <div className="p-4 max-w-3xl mx-auto space-y-6 pb-20">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-72 mt-2" />
          <Skeleton className="h-64 w-full mt-6" />
        </div>
      </>
    );
  }

  // Empty state — teacher has no assignments
  if (!assignmentsLoading && assignmentList.length === 0) {
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
          </motion.div>
          <motion.div variants={listItem}>
            <Card>
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

  // Populated state
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
          <p className="text-sm text-muted-foreground">Upload a PDF textbook for your assigned class</p>
        </motion.div>

        <motion.div variants={listItem}>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Class selector — populated from teacher's assignments */}
              <div>
                <label className="text-sm font-medium mb-2 block">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select a class...</option>
                  {assignmentList.map((a) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject — read-only, derived from the selected class */}
              {selectedAssignment && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {selectedAssignment.subjectName}
                  </div>
                </div>
              )}

              {/* File drop zone */}
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
                disabled={!file || !selectedClassId || isUploading}
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
