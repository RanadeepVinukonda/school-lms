import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { getAllTextbooks } from '@/services/textbookService';
import { getAllSubjects, getAllClasses } from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';

export default function TeacherTextbooksPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-teaching-space'],
    queryFn: async () => {
      const [allClasses, allSubjects, myAssignmentsRes, textbooks] = await Promise.all([
        getAllClasses(),
        getAllSubjects(),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
        getAllTextbooks(),
      ]);

      return {
        allClasses,
        allSubjects,
        myAssignments: myAssignmentsRes?.data ?? [],
        textbooks: textbooks,
      };
    },
  });

  const allClasses = rawData?.allClasses ?? [];
  const allSubjects = rawData?.allSubjects ?? [];
  const myAssignments = rawData?.myAssignments ?? [];
  const textbooks = rawData?.textbooks ?? [];

  // 1. Resolve classes teacher teaches
  const assignedClasses = useMemo(() => {
    const classIds = [...new Set(myAssignments.map((a) => a.classId))];
    return allClasses.filter((c) => classIds.includes(c.id));
  }, [allClasses, myAssignments]);

  const selectedClass = useMemo(
    () => assignedClasses.find((c) => c.id === selectedClassId) ?? null,
    [assignedClasses, selectedClassId]
  );

  // 2. Resolve subjects teacher teaches in selected class
  const assignedSubjectsInClass = useMemo(() => {
    if (!selectedClassId) return [];
    const subjectIds = myAssignments
      .filter((a) => a.classId === selectedClassId)
      .map((a) => a.subjectId);
    return allSubjects.filter((s) => subjectIds.includes(s.id));
  }, [allSubjects, myAssignments, selectedClassId]);

  const selectedSubject = useMemo(
    () => allSubjects.find((s) => s.id === selectedSubjectId) ?? null,
    [allSubjects, selectedSubjectId]
  );

  // 3. Resolve textbooks for selected class + subject
  const currentTextbooks = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId) return [];
    return textbooks.filter(
      (tb) => tb.classId === selectedClassId && tb.subjectId === selectedSubjectId
    );
  }, [textbooks, selectedClassId, selectedSubjectId]);

  return (
    <>
      <SEOHead title="Teaching Space" description="Manage textbooks, classes, and subjects" canonical="/teacher/textbooks" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-10 pb-32"
      >
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span
              className={`hover:underline cursor-pointer ${!selectedClassId ? 'font-semibold text-foreground' : ''}`}
              onClick={() => {
                setSelectedClassId(null);
                setSelectedSubjectId(null);
              }}
            >
              Classes
            </span>
            {selectedClass && (
              <>
                <Icon name="chevron_right" size={14} />
                <span
                  className={`hover:underline cursor-pointer ${!selectedSubjectId ? 'font-semibold text-foreground' : ''}`}
                  onClick={() => {
                    setSelectedSubjectId(null);
                  }}
                >
                  {selectedClass.name}
                </span>
              </>
            )}
            {selectedClass && selectedSubject && (
              <>
                <Icon name="chevron_right" size={14} />
                <span className="font-semibold text-foreground">
                  {selectedSubject.name}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div>
              <h1 className="text-headline-sm font-bold tracking-tight">
                {!selectedClassId
                  ? 'Teaching Space'
                  : !selectedSubjectId
                  ? `${selectedClass?.name ?? ''} — Subjects`
                  : `${selectedClass?.name ?? ''} &middot; ${selectedSubject?.name ?? ''} Textbooks`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {!selectedClassId
                  ? `Select a class to manage. You teach in ${assignedClasses.length} class${assignedClasses.length !== 1 ? 'es' : ''}.`
                  : !selectedSubjectId
                  ? `Manage subjects you teach in ${selectedClass?.name ?? ''}.`
                  : `Browse textbooks or upload materials for ${selectedSubject?.name ?? ''}.`}
              </p>
            </div>
            {selectedClassId && selectedSubjectId && currentTextbooks.length > 0 && (
              <Button asChild>
                <Link
                  to={`/teacher/textbooks/upload?classId=${selectedClassId}&subjectId=${selectedSubjectId}`}
                  className="gap-1"
                >
                  <Icon name="upload_file" size={16} />
                  Upload Textbook
                </Link>
              </Button>
            )}
          </div>
        </div>

        <DataFetchWrapper
          data={rawData}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          loadingType="list"
        >
          {() => (
            <>
              {/* VIEW 1: Classes Selection */}
              {!selectedClassId && (
                assignedClasses.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-12 text-center space-y-4">
                      <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">You are not assigned to any classes yet. Contact your administrator.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {assignedClasses.map((cls, idx) => {
                      const subjectsCount = myAssignments.filter((a) => a.classId === cls.id).length;
                      return (
                        <motion.div
                          key={cls.id}
                          variants={cardStackReveal}
                          custom={idx}
                          onClick={() => setSelectedClassId(cls.id)}
                          className="cursor-pointer"
                        >
                          <Card className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between group">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                  <Icon name="school" size={24} />
                                </div>
                                {cls.roomNumber && (
                                  <Badge variant="outline" className="text-xs bg-muted/40">
                                    Room {cls.roomNumber}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-6">
                                <h3 className="text-title-md font-bold group-hover:text-primary transition-colors">{cls.name}</h3>
                                <p className="text-body-sm text-muted-foreground mt-1">Code: {cls.code}</p>
                                {cls.academicYear && <p className="text-body-xs text-muted-foreground mt-0.5">Year: {cls.academicYear}</p>}
                              </div>
                            </CardContent>
                            <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground">{subjectsCount} Subject{subjectsCount !== 1 ? 's' : ''} Taught</span>
                              <Icon name="arrow_forward" size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )
              )}

              {/* VIEW 2: Subjects Selection */}
              {selectedClassId && !selectedSubjectId && (
                assignedSubjectsInClass.length === 0 ? (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClassId(null)} className="gap-1">
                      <Icon name="arrow_back" size={16} /> Back to Classes
                    </Button>
                    <Card className="border-border/60">
                      <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">No subjects assigned in this class.</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClassId(null)} className="gap-1">
                      <Icon name="arrow_back" size={16} /> Back to Classes
                    </Button>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {assignedSubjectsInClass.map((sub, idx) => {
                        const subTextbooksCount = textbooks.filter(
                          (t) => t.classId === selectedClassId && t.subjectId === sub.id
                        ).length;

                        return (
                          <motion.div
                            key={sub.id}
                            variants={cardStackReveal}
                            custom={idx}
                            onClick={() => setSelectedSubjectId(sub.id)}
                            className="cursor-pointer"
                          >
                            <Card className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between group">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div
                                    className="h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md"
                                    style={{ backgroundColor: `${sub.color ?? '#6366f1'}18` }}
                                  >
                                    <Icon name={sub.icon ?? 'menu_book'} size={24} style={{ color: sub.color ?? '#6366f1' }} />
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {sub.category ?? 'General'}
                                  </Badge>
                                </div>
                                <div className="mt-6">
                                  <h3 className="text-title-md font-bold group-hover:text-primary transition-colors" style={{ color: sub.color }}>{sub.name}</h3>
                                  <p className="text-body-sm text-muted-foreground mt-1">Code: {sub.code}</p>
                                </div>
                              </CardContent>
                              <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">{subTextbooksCount} Textbook{subTextbooksCount !== 1 ? 's' : ''}</span>
                                <Icon name="arrow_forward" size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>
                )
              )}

              {/* VIEW 3: Textbooks List */}
              {selectedClassId && selectedSubjectId && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSubjectId(null)} className="gap-1">
                      <Icon name="arrow_back" size={16} /> Back to Subjects
                    </Button>
                    <Button asChild size="sm">
                      <Link
                        to={`/teacher/textbooks/upload?classId=${selectedClassId}&subjectId=${selectedSubjectId}`}
                        className="gap-1"
                      >
                        <Icon name="upload_file" size={16} />
                        Upload Textbook
                      </Link>
                    </Button>
                  </div>
                  {currentTextbooks.length === 0 ? (
                    <Card className="border-border/60">
                      <CardContent className="p-12 text-center space-y-6">
                        <Icon name="auto_stories" size={48} className="text-muted-foreground/30 mx-auto" />
                        <div className="space-y-2">
                          <p className="text-title-md font-bold">No textbooks uploaded yet</p>
                          <p className="text-body-sm text-muted-foreground max-w-sm mx-auto">
                            Upload a textbook PDF for {selectedSubject?.name} in {selectedClass?.name} to begin AI concept and question bank parsing.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {currentTextbooks.map((tb, idx) => (
                        <motion.div key={tb.id} variants={cardStackReveal} custom={idx}>
                          <Link to={`/teacher/textbooks/${tb.id}`} className="block h-full">
                            <Card className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between group">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <div
                                    className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: `${selectedSubject?.color ?? '#6366f1'}15` }}
                                  >
                                    <Icon name="auto_stories" size={24} style={{ color: selectedSubject?.color ?? '#6366f1' }} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-title-sm truncate group-hover:text-primary transition-colors">{tb.title}</h4>
                                    <p className="text-body-xs text-muted-foreground mt-0.5 truncate">{selectedSubject?.name}</p>
                                    {tb.description && <p className="text-body-xs text-muted-foreground mt-2 line-clamp-2">{tb.description}</p>}
                                  </div>
                                </div>
                              </CardContent>
                              <div className="px-6 py-4 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-semibold">
                                {tb.status === 'processing' ? (
                                  <Badge variant="outline" className="text-[10px] bg-blue-50/50 text-blue-600 border-blue-200 py-0 px-2 font-semibold">
                                    <Icon name="sync" className="animate-spin mr-1" size={12} /> Processing
                                  </Badge>
                                ) : tb.status === 'failed' ? (
                                  <Badge variant="outline" className="text-[10px] bg-red-50/50 text-red-600 border-red-200 py-0 px-2 font-semibold">
                                    <Icon name="error" className="mr-1" size={12} /> Failed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {tb.chapterCount ?? 0} Chapter{(tb.chapterCount ?? 0) !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
