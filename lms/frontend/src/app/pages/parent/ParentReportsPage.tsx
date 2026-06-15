import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { staggerContainer, cardStackReveal, scrollReveal } from '@/lib/motion';
import { getChildren, getChildReport, getRecommendations } from '@/services/parentService';

export default function ParentReportsPage() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: children } = useQuery({
    queryKey: ['parent-children'],
    queryFn: getChildren,
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['parent-recommendations'],
    queryFn: getRecommendations,
  });

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['parent-child-report', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return null;
      setGenerating(true);
      try {
        return await getChildReport(selectedChildId);
      } finally {
        setGenerating(false);
      }
    },
    enabled: !!selectedChildId,
  });

  const report = (reportData as any)?.report;
  const childName = (reportData as any)?.studentName;

  const getChildName = (id: string) => {
    if (!children) return 'Child';
    const child = children.find((c: any) => c.id === id);
    return child?.displayName ?? 'Child';
  };

  return (
    <>
      <SEOHead title="Reports" description="AI-generated weekly progress reports" canonical="/parent/reports" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Reports & Recommendations</h1>
          <p className="text-body-md text-muted-foreground mt-1">AI-powered insights into your child&apos;s learning</p>
        </motion.div>

        <section>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-md flex items-center gap-2">
                  <Icon name="auto_awesome" size={18} className="text-muted-foreground" />
                  AI Weekly Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a child to generate an AI-powered weekly progress report with learning gap analysis and recommendations.
                </p>

                {children && children.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {children.map((child: any) => (
                      <Button
                        key={child.id}
                        variant={selectedChildId === child.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedChildId(child.id)}
                        className="gap-1"
                      >
                        <Icon name="person" size={14} />
                        {child.displayName}
                      </Button>
                    ))}
                  </div>
                )}

                {selectedChildId && (
                  <DataFetchWrapper
                    data={report}
                    isLoading={reportLoading || generating}
                    error={reportError}
                    onRetry={() => refetchReport()}
                    loadingType="card"
                  >
                    {(r: any) => (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="space-y-4 mt-4"
                      >
                        <div className="p-4 rounded-lg bg-primary-container/20 border border-primary-container">
                          <p className="text-body-md font-medium mb-1">{childName}</p>
                          <p className="text-sm text-muted-foreground">{r.summary}</p>
                        </div>

                        {r.strengths && r.strengths.length > 0 && (
                          <div>
                            <p className="text-title-sm font-bold flex items-center gap-1 mb-2">
                              <Icon name="star" size={16} className="text-success" /> Strengths
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {r.strengths.map((s: string, i: number) => (
                                <Badge key={i} variant="success" className="text-label-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.learningGaps && r.learningGaps.length > 0 && (
                          <div>
                            <p className="text-title-sm font-bold flex items-center gap-1 mb-2">
                              <Icon name="warning" size={16} className="text-error" /> Learning Gaps
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {r.learningGaps.map((g: string, i: number) => (
                                <Badge key={i} variant="destructive" className="text-label-xs">{g}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.recommendations && r.recommendations.length > 0 && (
                          <div>
                            <p className="text-title-sm font-bold flex items-center gap-1 mb-2">
                              <Icon name="lightbulb" size={16} className="text-warning" /> Recommendations
                            </p>
                            <div className="space-y-2">
                              {r.recommendations.map((rec: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                                  <Icon
                                    name={rec.priority === 'high' ? 'priority_high' : rec.priority === 'medium' ? 'drag_handle' : 'low_priority'}
                                    size={16}
                                    className={rec.priority === 'high' ? 'text-error mt-0.5' : rec.priority === 'medium' ? 'text-warning mt-0.5' : 'text-success mt-0.5'}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{rec.area}</p>
                                    <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                                  </div>
                                  <Badge
                                    variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'warning' : 'secondary'}
                                    className="text-[10px] shrink-0"
                                  >
                                    {rec.priority}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {r.weeklyOverview && (
                          <div className="p-3 rounded-lg bg-card border">
                            <p className="text-title-sm font-bold mb-1">Weekly Overview</p>
                            <p className="text-sm text-muted-foreground">{r.weeklyOverview}</p>
                          </div>
                        )}

                        {r.nextSteps && r.nextSteps.length > 0 && (
                          <div>
                            <p className="text-title-sm font-bold mb-2">Next Steps</p>
                            <ol className="list-decimal list-inside space-y-1">
                              {r.nextSteps.map((step: string, i: number) => (
                                <li key={i} className="text-sm text-muted-foreground">{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </DataFetchWrapper>
                )}

                {(!children || children.length === 0) && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Icon name="person_off" size={32} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No children linked to your account</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-md flex items-center gap-2">
                  <Icon name="checklist" size={18} className="text-muted-foreground" />
                  Recommendations Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <DataFetchWrapper
                  data={recommendations}
                  isLoading={recsLoading}
                  error={null}
                  onRetry={() => {}}
                  loadingType="card"
                >
                  {(recs: any) => (
                    <>
                      {recs.recommendations?.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="check_circle" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No recommendations available</p>
                        </div>
                      ) : (
                        <motion.div
                          variants={staggerContainer}
                          initial="hidden"
                          animate="show"
                          className="space-y-6"
                        >
                          {recs.recommendations?.map((childRec: any) => (
                            <motion.div key={childRec.studentId} variants={scrollReveal}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 rounded-lg bg-primary-container flex items-center justify-center">
                                  <Icon name="person" size={16} className="text-primary" />
                                </div>
                                <p className="text-title-sm font-bold">{childRec.studentName}</p>
                                <Badge variant="secondary" className="text-label-xs">
                                  Avg: {childRec.averageScore}%
                                </Badge>
                              </div>
                              <div className="space-y-2 ml-2">
                                {childRec.recommendations?.map((rec: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30">
                                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                      rec.priority === 'high' ? 'bg-error' : rec.priority === 'medium' ? 'bg-warning' : 'bg-success'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{rec.area}</p>
                                      <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </>
                  )}
                </DataFetchWrapper>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </motion.div>
    </>
  );
}
