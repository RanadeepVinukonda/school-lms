import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/common/SEOHead';
import { cardStackReveal } from '@/lib/motion';

export default function NotFoundPage() {
  return (
    <>
      <SEOHead title="Page Not Found" description="The page you are looking for does not exist" />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
        >
          <motion.div
            variants={cardStackReveal}
            custom={0}
            className="text-center max-w-md mx-auto"
          >
            <div className="text-display-xs md:text-display-sm font-bold text-primary/20 mb-4">404</div>
            <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-primary/40" />
            </div>
            <h1 className="text-headline-sm font-bold mb-2">Page not found</h1>
            <p className="text-body-md text-muted-foreground mb-6">
              The page you're looking for doesn't exist or has been moved.
              Check the URL or navigate back to a known page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/"><Home className="h-4 w-4 mr-2" />Go Home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/student/dashboard">Dashboard</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
