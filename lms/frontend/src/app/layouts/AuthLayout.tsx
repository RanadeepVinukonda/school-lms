import { Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Genesis. All rights reserved.
      </p>
    </div>
  );
}
