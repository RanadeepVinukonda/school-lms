import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/common/SEOHead';

export default function ForbiddenPage() {
  return (
    <>
      <SEOHead title="Access Denied" description="You do not have permission to access this page" />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-bold text-destructive/20 mb-4">403</div>
        <div className="h-24 w-24 rounded-full bg-destructive/5 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-12 w-12 text-destructive/40" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. This area is restricted
          to certain user roles.
        </p>

        <Card className="mb-6">
          <CardContent className="p-4 text-left space-y-2">
            <p className="text-sm font-medium">Your current role:</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">student</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Required</span>
              <span className="font-medium">teacher or admin</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/"><Home className="h-4 w-4 mr-2" />Go Home</Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />Go Back
          </Button>
        </div>
      </motion.div>
    </div>
    </>
  );
}
