import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Settings, Save, Bell, Shield, Globe, Loader2,
  Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SEOHead } from '@/components/common/SEOHead';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved');
    }, 1000);
  };

  return (
    <>
      <SEOHead title="Settings" description="System configuration settings" canonical="/admin/settings" />
      <div className="p-4 max-w-3xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-4">System Settings</h1>

      <Tabs defaultValue="general">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex-1"><Globe className="h-4 w-4 mr-1" />General</TabsTrigger>
          <TabsTrigger value="features" className="flex-1"><Bell className="h-4 w-4 mr-1" />Features</TabsTrigger>
          <TabsTrigger value="security" className="flex-1"><Shield className="h-4 w-4 mr-1" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">School Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input defaultValue="Springfield High School" />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" defaultValue="admin@springfield.edu" />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input defaultValue="2025-2026" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>App Name</Label>
                <Input defaultValue="School LMS" />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </TabsContent>

        <TabsContent value="features" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Feature Toggles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Student Registration', desc: 'Allow new students to register', default: true },
                { label: 'Teacher Registration', desc: 'Allow new teachers to register', default: true },
                { label: 'Quiz Auto-Grading', desc: 'Automatically grade quiz submissions', default: true },
                { label: 'Assignment Resubmission', desc: 'Allow students to resubmit assignments', default: false },
                { label: 'Discussion Forums', desc: 'Enable course discussion forums', default: true },
                { label: 'Parent Portal', desc: 'Enable parent/guardian access', default: false },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Switch defaultChecked={f.default} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Minimum Password Length</Label>
                <Input type="number" defaultValue={6} className="w-24" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Require 2FA for all users</p>
                </div>
                <Switch defaultChecked={false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Session Timeout</p>
                  <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked={true} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Allowed Email Domains</Label>
                <Textarea placeholder="school.edu" rows={2} defaultValue="school.edu" />
                <p className="text-xs text-muted-foreground">One domain per line. Leave empty to allow all.</p>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
