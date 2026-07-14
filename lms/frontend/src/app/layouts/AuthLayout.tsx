import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to content
      </a>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-48 -right-48 h-[36rem] w-[36rem] rounded-full bg-primary/6 blur-3xl" />
          <div className="absolute -bottom-48 -left-48 h-[30rem] w-[30rem] rounded-full bg-tertiary/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center mb-8">
          <img
            src="/genesis_icon.png"
            alt="Genesis"
            className="h-16 w-auto object-contain mb-3"
          />
          <p className="text-title-md font-bold text-primary">Genesis</p>
          <p className="text-label-sm text-muted-foreground">Learn &bull; Lead &bull; Achieve</p>
        </div>

        <div id="main-content" className="w-full max-w-md relative z-10">
          <Outlet />
        </div>

        <div className="mt-8 flex items-center gap-4 text-label-sm text-muted-foreground relative z-10">
          <p>&copy; {new Date().getFullYear()} Genesis. All rights reserved.</p>
          <span aria-hidden="true">&middot;</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
          <span aria-hidden="true">&middot;</span>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
        </div>
      </div>
    </>
  );
}
