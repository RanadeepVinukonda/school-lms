import { Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-primary p-2">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Genesis</h1>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Genesis. All rights reserved.
      </p>
    </div>
  );
}
