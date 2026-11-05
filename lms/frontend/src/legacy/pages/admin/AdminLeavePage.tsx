import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { hrService, LeaveRequest } from '@/services/hrService';

export default function AdminLeavePage() {
  const queryClient = useQueryClient();
  const { data: leavesRes, isLoading, error } = useQuery({
    queryKey: ['admin-leave-requests'],
    queryFn: () => hrService.getLeaves(),
  });

  const leaves = leavesRes?.data || [];
  const updateStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: 'approved' | 'rejected' }) =>
      hrService.updateLeaveStatus(data.id, data.status),
    onSuccess: () => {
      toast.success('Leave status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update status'),
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <>
      <SEOHead title="Leave Approvals" description="Review and approve staff leave requests" />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Leave Requests</h1>
          <p className="text-body-md text-muted-foreground mt-1">Review and approve leave applications submitted by school staff</p>
        </div>

        <DataFetchWrapper data={leaves} isLoading={isLoading} error={error} onRetry={() => queryClient.invalidateQueries({ queryKey: ['admin-leave-requests'] })}>
          {() => (
            <div className="space-y-4">
              {leaves.map((request: LeaveRequest) => (
                <Card key={request.id} className="border-border/60">
                  <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-title-sm font-bold">{request.staff?.name || 'Unknown Staff'}</h3>
                        {statusBadge(request.status)}
                      </div>
                      <p className="text-label-sm text-muted-foreground">
                        Duration: <strong className="text-foreground">{new Date(request.start_date).toLocaleDateString()} to {new Date(request.end_date).toLocaleDateString()}</strong>
                      </p>
                      {request.reason && (
                        <p className="text-body-sm text-muted-foreground italic">" {request.reason} "</p>
                      )}
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-error border-error/20 hover:bg-error-container/20"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                          loading={updateStatusMutation.isPending}
                        >
                          <Icon name="close" size={16} className="mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'approved' })}
                          loading={updateStatusMutation.isPending}
                        >
                          <Icon name="check" size={16} className="mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {leaves.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Icon name="inbox" size={40} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-title-sm font-semibold">No leave requests found</p>
                </div>
              )}
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
