import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getUserByRole } from '@/services/dataService';

export default function AdminTeachersPage() {
  const [search, setSearch] = useState('');

  const { data: teachers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => getUserByRole('teacher'),
  });

  const filtered = useMemo(
    () =>
      teachers.filter((t) => {
        const q = search.toLowerCase();
        return t.displayName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
      }),
    [teachers, search]
  );

  return (
    <>
      <SEOHead title="Teachers" description="Manage teachers" canonical="/admin/teachers" />
      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : isError ? (
        <ErrorState title="Failed to load teachers" message="Could not fetch teacher data" onRetry={() => refetch()} />
      ) : (
        <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem} className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-headline-sm">Teachers</h1>
                <p className="text-sm text-on-surface-variant">{teachers.length} total teachers</p>
              </div>
            </motion.div>

            <motion.div variants={listItem}>
              <div className="relative max-w-sm">
                <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </motion.div>

            {filtered.length === 0 ? (
              <motion.div variants={listItem}>
                {teachers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="badge" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No teachers yet</p>
                      <p className="text-sm text-on-surface-variant">Teachers will appear here once they register.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16">
                      <Icon name="search_off" size={48} className="text-on-surface-variant/50" />
                      <p className="font-medium">No teachers match your search</p>
                      <p className="text-sm text-on-surface-variant">Try a different search term.</p>
                      <button className="text-sm text-primary hover:underline" onClick={() => setSearch('')}>
                        Clear Search
                      </button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div variants={listItem}>
                <div className="border-outline-variant rounded-lg overflow-hidden border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-outline-variant border-b bg-surface-variant/50">
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Name</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Email</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Teacher ID</th>
                        <th className="text-left text-label-sm font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-outline-variant divide-y">
                      {filtered.map((teacher) => {
                        return (
                          <tr key={teacher.id} className="hover:bg-surface-variant/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-body-md font-medium">{teacher.displayName}</span>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant">{teacher.email}</td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{teacher.teacherId || '\u2014'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={teacher.isActive === false ? 'destructive' : 'success'} className="text-[10px]">
                                {teacher.isActive === false ? 'Inactive' : 'Active'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
            </motion.div>
          </motion.div>
      )}
    </>
  );
}
