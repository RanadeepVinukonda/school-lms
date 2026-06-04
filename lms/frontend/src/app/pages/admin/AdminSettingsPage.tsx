import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { listContainer, listItem } from '@/lib/motion';

const schoolInfo = {
  name: 'Genesis Academy',
  address: '123 Education Lane, Learning City, ED 10001',
  academicYear: '2025\u20132026',
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
  { icon: 'school', label: 'Students', value: '3 Active', bg: 'bg-primary-container' },
  { icon: 'badge', label: 'Teachers', value: '2 Active', bg: 'bg-success-container' },
  { icon: 'group', label: 'Users', value: '6 Total', bg: 'bg-primary-container' },
  { icon: 'class', label: 'Classes', value: '2 Active', bg: 'bg-warning-container' },
];

export default function AdminSettingsPage() {
  const [saving] = useState(false);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const displayData = !isLoading && !isError ? schoolInfo : undefined;

  return (
    <>
      <SEOHead title="Settings" description="System configuration settings" canonical="/admin/settings" />
      <DataFetchWrapper
        data={displayData}
        isLoading={isLoading}
        error={isError ? new Error('Failed to load settings') : null}
        onRetry={() => refetch()}
        loadingType="card"
      >
        {() => (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={listItem}>
              <h1 className="text-headline-sm">Settings</h1>
              <p className="text-sm text-on-surface-variant">School configuration and system information</p>
            </motion.div>

            <motion.div
              variants={listItem}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {statsConfig.map((stat) => (
                <Card key={stat.label} variant="elevated">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.bg}`}>
                      <Icon name={stat.icon} size={20} className="text-on-primary-container" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-on-surface-variant">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <motion.div variants={listItem}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-title-md flex items-center gap-2">
                    <Icon name="school" size={18} className="text-on-surface-variant" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {Object.entries(schoolInfo).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider mb-0.5">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </dt>
                        <dd className="text-body-md font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={listItem}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-title-md flex items-center gap-2">
                    <Icon name="settings" size={18} className="text-on-surface-variant" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {systemConfig.map((item) => (
                      <div key={item.label}>
                        <dt className="text-label-sm font-medium text-on-surface-variant uppercase tracking-wider mb-0.5">
                          {item.label}
                        </dt>
                        <dd className="text-body-md font-medium flex items-center gap-2">
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
        )}
      </DataFetchWrapper>
    </>
  );
}
