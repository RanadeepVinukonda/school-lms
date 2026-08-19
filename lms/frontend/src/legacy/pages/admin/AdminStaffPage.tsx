import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Badge } from '@/components/ui/badge';
import { getAllUsers } from '@/services/dataService';

export default function AdminStaffPage() {
  const { data: usersRes = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAllUsers,
  });

  const teacherUsers = usersRes.filter((u) => u.role === 'teacher');

  return (
    <>
      <SEOHead title="Staff Directory" description="Manage school staff" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Staff Management</h1>
          <p className="text-body-md text-muted-foreground mt-1 font-normal">Directory of all registered school teachers and staff</p>
        </div>

        <DataFetchWrapper data={teacherUsers} isLoading={usersLoading} onRetry={refetchUsers} loadingType="table">
          {() => (
            <div className="border border-border/60 rounded-2xl overflow-x-auto bg-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3">Teacher Name</th>
                    <th className="px-6 py-3">Email Address</th>
                    <th className="px-6 py-3">Phone Number</th>
                    <th className="px-6 py-3">Joined Date</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-title-sm">
                  {teacherUsers.map((teacher: any) => (
                    <tr key={teacher.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-semibold">{teacher.displayName || teacher.email}</td>
                      <td className="px-6 py-4 font-mono text-xs">{teacher.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{teacher.phone_number || teacher.phoneNumber || '-'}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant={teacher.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                          {teacher.isActive === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
