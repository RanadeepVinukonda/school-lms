import { Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function AuthLayout() {
  return (
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
      Skip to content
    </a>
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div id="main-content" className="w-full max-w-md">
        <Outlet />
      </div>
      <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Genesis. All rights reserved.</p>
        <span aria-hidden="true">&middot;</span>
        <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
        <span aria-hidden="true">&middot;</span>
        <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
      </div>
    </div>
  );
}
