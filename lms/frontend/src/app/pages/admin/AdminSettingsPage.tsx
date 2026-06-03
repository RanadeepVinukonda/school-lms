import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { listContainer, listItem } from '@/lib/motion';

const schoolInfo = {
  name: 'Genesis Academy',
  address: '123 Education Lane, Learning City, ED 10001',
  academicYear: '2025–2026',
  phone: '+1 (555) 123-4567',
  email: 'admin@genesis.edu',
  website: 'https://genesis.edu',
};

const systemConfig = [
  { label: 'Application Version', value: 'v2.4.1' },
  { label: 'Build Number', value: '2025.06.01.001' },
  { label: 'Database Status', value: 'Connected', variant: 'success' as const },
  { label: 'Authentication Provider', value: 'Firebase Auth' },
  { label: 'Storage Provider', value: 'Firebase Storage' },
  { label: 'Max File Upload', value: '10 MB' },
  { label: 'Session Timeout', value: '60 minutes' },
  { label: 'Backup Schedule', value: 'Daily at 02:00 AM' },
  { label: 'API Rate Limit', value: '1000 req/min' },
  { label: 'Environment', value: 'Production', variant: 'info' as const },
];

const statsConfig = [
  { icon: 'school', label: 'Students', value: '3 Active', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: 'badge', label: 'Teachers', value: '2 Active', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: 'group', label: 'Users', value: '6 Total', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: 'class', label: 'Classes', value: '2 Active', color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [saving] = useState(false);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  if (isLoading) return <SettingsSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead title="Settings" description="System configuration settings" canonical="/admin/settings" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon name="error" size={32} className="text-destructive" />
            </div>
            <p className="font-medium">Failed to load settings</p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={16} className="mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Settings" description="System configuration settings" canonical="/admin/settings" />
      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={listItem}>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">School configuration and system information</p>
        </motion.div>

        <motion.div
          variants={listItem}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {statsConfig.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
                  <Icon name={stat.icon} size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="school" size={18} className="text-muted-foreground" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {Object.entries(schoolInfo).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="settings" size={18} className="text-muted-foreground" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {systemConfig.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                      {item.label}
                    </dt>
                    <dd className="text-sm font-medium flex items-center gap-2">
                      {'variant' in item ? (
                        <Badge variant={item.variant as 'success' | 'info'} className="text-[10px]">
                          {item.value}
                        </Badge>
                      ) : (
                        <span>{item.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={listItem} className="flex justify-end">
          <Button disabled={saving}>
            {saving ? (
              <>
                <Icon name="sync" size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="refresh" size={16} className="mr-2" />
                Refresh Data
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}
