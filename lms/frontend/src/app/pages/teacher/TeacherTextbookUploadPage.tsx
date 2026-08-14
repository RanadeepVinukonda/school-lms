import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import UploadProgressBanner from '@/components/textbook/UploadProgressBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useUploadStore } from '@/store/uploadStore';
import { getAllSubjects } from '@/services/dataService';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
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
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClassId = searchParams.get('classId') ?? '';
  const querySubjectId = searchParams.get('subjectId') ?? '';
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileAssignments, setFileAssignments] = useState<Record<number, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: allClasses = [] } = useClasses();
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const myAssignments = await teacherClassSubjectService.getMyAssignments().then((res) => res.data);
      const allSubjects = await getAllSubjects();
      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const classMap = new Map(allClasses.map((c) => [c.id, c]));
      const mapped = myAssignments.map((data) => {
        const subject = subjectMap.get(data.subjectId);
        const cls = classMap.get(data.classId);
        return {
          id: data.id,
          classId: data.classId,
          className: cls ? formatClassName(cls) : _('Unknown Class'),
          subjectId: data.subjectId,
          subjectName: subject?.name ?? _('Unknown Subject'),
        } as TeacherAssignment;
      });

      const seen = new Set<string>();
      const uniqueAssignments: TeacherAssignment[] = [];
      for (const item of mapped) {
        const key = `${item.classId}-${item.subjectId}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueAssignments.push(item);
        }
      }
      return uniqueAssignments;
    },
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const getDefaultAssignmentId = useCallback(() => {
    if (!assignmentList.length) return '';
    if (queryClassId && querySubjectId) {
      const found = assignmentList.find(
        (a) => a.classId === queryClassId && a.subjectId === querySubjectId
      );
      if (found) return found.id;
    }
    return assignmentList[0].id;
  }, [assignmentList, queryClassId, querySubjectId]);

  const getAssignmentForFile = useCallback((index: number): TeacherAssignment | null => {
    const id = fileAssignments[index] || getDefaultAssignmentId();
    return assignmentList.find((a) => a.id === id) ?? null;
  }, [fileAssignments, assignmentList, getDefaultAssignmentId]);

  // Fill missing assignments when assignment list loads or files change
  useEffect(() => {
    if (!assignmentList.length) return;
    setFileAssignments((prev) => {
      const next = { ...prev };
      let changed = false;
      const defaultId = getDefaultAssignmentId();
      for (let i = 0; i < files.length; i++) {
        if (!next[i]) {
          next[i] = defaultId;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [files.length, assignmentList, getDefaultAssignmentId]);

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
      setFileAssignments((prev) => {
        const next = { ...prev };
        const defaultId = getDefaultAssignmentId();
        droppedFiles.forEach(() => {
          const idx = Object.keys(next).length;
          if (!next[idx]) next[idx] = defaultId;
        });
        return next;
      });
    } else {
      toast.error(_('Please drop valid PDF files'));
    }
  }, [getDefaultAssignmentId]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      setFiles((prev) => [...prev, ...selected]);
      setFileAssignments((prev) => {
        const next = { ...prev };
        const defaultId = getDefaultAssignmentId();
        const start = Object.keys(next).length;
        selected.forEach((_, i) => {
          next[start + i] = defaultId;
        });
        return next;
      });
    }
  }, [getDefaultAssignmentId]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileAssignments((prev) => {
      const next: Record<number, string> = {};
      const ids = Object.values(prev);
      ids.splice(index, 1);
      ids.forEach((id, i) => { next[i] = id; });
      return next;
    });
  }, []);

  const uploadSingleFile = async (file: File, assignment: TeacherAssignment, taskId: string, addLog: (msg: string) => void) => {
    addLog(`Uploading ${file.name} to server...`);

    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    bodyFormData.append('subjectId', assignment.subjectId);
    bodyFormData.append('classId', assignment.classId);
    bodyFormData.append('title', file.name.replace('.pdf', ''));
    bodyFormData.append('description', file.name.replace('.pdf', ''));

    const res = await api.post('/textbooks', bodyFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: (e) => {
        if (e.total) {
          const pct = Math.round((e.loaded / e.total) * 100);
          useUploadStore.setState((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === taskId ? { ...t, progress: pct === 100 ? 99 : pct } : t
            ),
          }));
        }
      },
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
    if (files.length === 0) return;

    try {
      const hasMissingAssignment = files.some((_, i) => !getAssignmentForFile(i));
      if (hasMissingAssignment) {
        toast.error(_('Please select a class & subject for each file'));
        return;
      }

      setIsUploading(true);

      let lastTextbookId: string | null = null;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const assignment = getAssignmentForFile(i)!;
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
              subjectId: assignment.subjectId,
              subjectName: assignment.subjectName,
              classId: assignment.classId,
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
          lastTextbookId = await uploadSingleFile(file, assignment, taskId, addLog);
          toast.success(`${file.name} ${_('uploaded')}`);
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

      queryClient.invalidateQueries({ queryKey: ['teacher-teaching-space'] });

      if (lastTextbookId) {
        navigate(ROUTES.TEACHER_TEXTBOOK(lastTextbookId));
      } else {
        navigate(ROUTES.TEACHER_TEXTBOOKS);
      }
    } catch (err: unknown) {
      setIsUploading(false);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : _('Upload failed unexpectedly');
      toast.error(message);
    }
  };

  if (assignmentsLoading) {
    return (
      <>
      <SEOHead title={_('Upload Textbook')} description={_('Upload and process textbook PDFs')} canonical="/teacher/textbooks/upload" />
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
        <SEOHead title={_('Upload Textbook')} description={_('Upload and process textbook PDFs')} canonical="/teacher/textbooks/upload" />
        <div className="sm:p-6 p-4 max-w-3xl mx-auto space-y-16 pb-32">
          <div>
            <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
              <Icon name="arrow_back" size={16} className="mr-1" />
              {_('Back')}
            </Button>
            <h1 className="text-headline-sm">{_('Upload Textbook')}</h1>
          </div>
          <div>
            <Card className="border-border/60">
              <CardContent className="p-12 text-center space-y-4">
                <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {_("You haven't been assigned to any class/subject yet. Contact your administrator.")}
                </p>
                <Button variant="outline" onClick={() => navigate(ROUTES.TEACHER_DASHBOARD)}>
                  {_('Go to Dashboard')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Upload Textbook" description="Upload and process textbook PDFs" canonical="/teacher/textbooks/upload" />
      <UploadProgressBanner />
      <div className="sm:p-6 p-4 max-w-3xl mx-auto space-y-16 pb-32">
        <div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
            <Icon name="arrow_back" size={16} className="mr-1" />
            {_('Back')}
          </Button>
          <h1 className="text-headline-sm">{_('Upload Textbooks')}</h1>
        </div>

        <div>
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-6">

              {assignmentList.length > 1 && (
                <p className="text-xs text-muted-foreground -mb-2">
                  {_('Each file can be assigned to a different class & subject using the dropdown below.')}
                </p>
              )}

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
                  <p className="font-medium">{_('Drop PDFs here or click to browse')}</p>
                  <p className="text-xs text-muted-foreground">{_('Select multiple PDFs or a folder containing PDFs')}</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{files.length} {files.length > 1 ? _('files selected') : _('file selected')}</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {files.map((f, i) => {
                      const currentId = fileAssignments[i] || getDefaultAssignmentId();
                      const currentAssignment = assignmentList.find((a) => a.id === currentId);
                      return (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Icon name="picture_as_pdf" size={18} className="text-red-500 shrink-0" />
                            <span className="text-sm truncate flex-1">{f.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                          </div>
                          {assignmentList.length > 1 ? (
                            <select
                              value={currentId}
                              onChange={(e) =>
                                setFileAssignments((prev) => ({ ...prev, [i]: e.target.value }))
                              }
                              className="w-full sm:w-auto text-xs rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              {assignmentList.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.className} — {a.subjectName}
                                </option>
                              ))}
                            </select>
                          ) : currentAssignment ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {currentAssignment.className} — {currentAssignment.subjectName}
                            </span>
                          ) : null}
                          <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="shrink-0">
                            <Icon name="close" size={16} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSubmit}
                disabled={files.length === 0 || isUploading}
              >
                {isUploading ? (
                  <>
                    <Icon name="hourglass_top" size={18} className="animate-spin" />
                    {_('Uploading...')}
                  </>
                ) : (
                  <>
                    <Icon name="cloud_upload" size={18} />
                    {files.length > 1 ? `${_('Upload')} ${files.length} ${_('Textbooks')}` : _('Upload Textbook')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
