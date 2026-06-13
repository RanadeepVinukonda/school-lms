import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { cardStackReveal } from '@/lib/motion';
import { formatDate } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  targetId: string;
  targetType: string;
  targetName: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  summary: string;
  timestamp: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  activate: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  deactivate: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  release: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function getActionBadge(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  const className = key ? ACTION_COLORS[key] : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  return <Badge className={className}>{action}</Badge>;
}

export default function AdminAuditLogsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', page, pageSize, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/audit-logs?${params}`);
      return { items: res.data.data as AuditLog[], pagination: res.data.pagination as Pagination };
    },
  });

  const recoverMutation = useMutation({
    mutationFn: async (logId: string) => {
      await api.post(`/audit-logs/recover/${logId}`);
    },
    onSuccess: () => {
      setSelectedLog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
  });

  const pagination = logsQuery.data?.pagination;

  const handlePrev = useCallback(() => {
    if (pagination?.hasPrev) setPage((p) => p - 1);
  }, [pagination?.hasPrev]);

  const handleNext = useCallback(() => {
    if (pagination?.hasNext) setPage((p) => p + 1);
  }, [pagination?.hasNext]);

  return (
    <>
      <SEOHead title="Audit Logs" description="View and manage system audit logs" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0} className="space-y-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm">Audit Logs</h1>
              <p className="text-body-md text-muted-foreground">View and manage system audit logs</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="max-w-60 border-border/60 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <DataFetchWrapper data={logsQuery.data?.items} isLoading={logsQuery.isLoading} error={logsQuery.error} loadingType="list">
            {(items) => (
              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">No audit logs found.</p>
                )}
                {items.map((log) => (
                  <Card key={log.id} className="border-border/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:ring-1 hover:ring-primary/20" tabIndex={0} role="button" onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <span className="text-title-sm font-medium truncate">{log.summary}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-label-xs text-muted-foreground">
                            <span>{log.performedByName} ({log.performedByRole})</span>
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </div>
                        <Icon name={selectedLog?.id === log.id ? 'expand_less' : 'expand_more'} size={16} className="text-muted-foreground flex-shrink-0" />
                      </div>

                      {selectedLog?.id === log.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-border/60 space-y-2 text-label-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Target:</span> {log.targetType} "{log.targetName}" ({log.targetId})</div>
                            <div><span className="text-muted-foreground">Performed By:</span> {log.performedBy}</div>
                          </div>
                          {log.oldValue && (
                            <div>
                              <span className="text-muted-foreground">Old Value:</span>
                              <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto">{JSON.stringify(log.oldValue, null, 2)}</pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <span className="text-muted-foreground">New Value:</span>
                              <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto">{JSON.stringify(log.newValue, null, 2)}</pre>
                            </div>
                          )}
                          {log.action.includes('delete') && log.oldValue && (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); recoverMutation.mutate(log.id); }} disabled={recoverMutation.isPending}>
                              <Icon name="restore" size={14} className="mr-1" />
                              Recover Entity
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {pagination && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-label-xs text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={handlePrev}>
                        <Icon name="chevron_left" size={14} />
                        Prev
                      </Button>
                      <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={handleNext}>
                        Next
                        <Icon name="chevron_right" size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DataFetchWrapper>
        </motion.div>
      </motion.div>
    </>
  );
}
