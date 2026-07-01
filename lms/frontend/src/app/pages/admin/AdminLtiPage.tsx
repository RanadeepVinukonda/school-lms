import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { ltiService, LtiConfig } from '@/services/ltiService';

export default function AdminLtiPage() {
  const { register, handleSubmit, reset } = useForm<LtiConfig>();

  const { data: configRes, isLoading } = useQuery({
    queryKey: ['lti-config'],
    queryFn: () => ltiService.getConfig(),
  });

  useEffect(() => {
    if (configRes?.data) {
      reset(configRes.data);
    }
  }, [configRes, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: LtiConfig) => ltiService.saveConfig(data),
    onSuccess: () => toast.success('LTI 1.3 Platform details saved successfully'),
    onError: (err: any) => toast.error(err?.message || 'Failed to save configuration'),
  });

  const onSubmit = (data: LtiConfig) => {
    saveMutation.mutate(data);
  };

  const toolDetails = {
    loginUrl: `${window.location.origin}/api/lti/login`,
    launchUrl: `${window.location.origin}/api/lti/launch`,
    jwksUrl: `${window.location.origin}/api/lti/jwks`,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied URL to clipboard');
  };

  return (
    <>
      <SEOHead title="Moodle LTI 1.3 Integration" description="Configure LTI registration details" />
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Moodle LTI 1.3</h1>
          <p className="text-body-md text-muted-foreground mt-1">Register the LMS as an LTI External Tool inside Moodle</p>
        </motion.div>

        {/* Tool Endpoints */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-title-sm">LMS Tool Details</CardTitle>
            <CardDescription>Use these URLs when configuring this external tool in Moodle Administrator Settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Tool URL / Redirection URI', val: toolDetails.launchUrl },
              { label: 'Initiate Login URL', val: toolDetails.loginUrl },
              { label: 'Public Keystore URL (JWKS)', val: toolDetails.jwksUrl },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-label-sm text-muted-foreground block">{item.label}</label>
                <div className="flex gap-2 max-w-xl">
                  <Input readOnly value={item.val} className="flex-1 bg-muted/30 font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(item.val)}>
                    <Icon name="content_copy" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform Configuration Form */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-title-sm">Moodle Platform Configurations</CardTitle>
            <CardDescription>Configure credentials provided by Moodle for authentication and grade passback</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading configurations...</div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Platform ID (Issuer) *</label>
                  <Input placeholder="e.g. https://moodle.yourdomain.com" {...register('issuer', { required: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Client ID *</label>
                  <Input placeholder="Client ID from Moodle registration" {...register('client_id', { required: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Deployment ID *</label>
                  <Input placeholder="Deployment ID from Moodle registration" {...register('deployment_id', { required: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Platform Access Token URL *</label>
                  <Input placeholder="e.g. https://moodle.yourdomain.com/mod/lti/token.php" {...register('auth_token_url', { required: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Platform Authentication Request URL *</label>
                  <Input placeholder="e.g. https://moodle.yourdomain.com/mod/lti/auth.php" {...register('auth_login_url', { required: true })} />
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm text-muted-foreground block">Platform Public Keystore JWKS URL *</label>
                  <Input placeholder="e.g. https://moodle.yourdomain.com/mod/lti/certs.php" {...register('jwks_url', { required: true })} />
                </div>

                <div className="pt-2">
                  <Button type="submit" loading={saveMutation.isPending}>
                    Save Settings
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
