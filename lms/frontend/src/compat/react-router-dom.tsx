'use client';

// react-router-dom compatibility shim for Next.js
// This shim allows all 71 existing files to import from 'react-router-dom' without changes.
// Routes are defined in Next.js file-based routing under src/app/.

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';

// --- Outlet (replaces react-router-dom <Outlet />) ---
// In Next.js, page wrappers pass legacy page content via PageContentContext.
// Outlet renders that content.

const PageContentContext = createContext<React.ReactNode>(null);

export function PageContentProvider({
  content,
  children,
}: {
  content: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PageContentContext.Provider value={content}>
      {children}
    </PageContentContext.Provider>
  );
}

export function Outlet() {
  const content = useContext(PageContentContext);
  return <>{content}</>;
}

// --- Link (wraps next/link) ---

interface LinkProps {
  to: string;
  children: React.ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: unknown;
}

export function Link({ to, children, className, onClick, ...rest }: LinkProps) {
  const resolvedClassName = typeof className === 'function' ? className({ isActive: false }) : className;
  return (
    <NextLink
      href={to}
      className={resolvedClassName}
      onClick={onClick}
      {...filterAnchorProps(rest)}
    >
      {children}
    </NextLink>
  );
}

// --- NavLink (wraps next/link with active state) ---

interface NavLinkProps {
  to: string;
  children: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
  className?: string | ((props: { isActive: boolean }) => string);
  end?: boolean;
  [key: string]: unknown;
}

export function NavLink({ to, children, className, end = false, ...rest }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname.startsWith(to);
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className;
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children;
  return (
    <NextLink
      href={to}
      className={resolvedClassName}
      {...filterAnchorProps(rest)}
    >
      {resolvedChildren}
    </NextLink>
  );
}

// --- useNavigate ---

export function useNavigate() {
  const router = useRouter();

  const navigate = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === 'number') {
        // history.go(n)
        window.history.go(to);
        return;
      }
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    },
    [router],
  );

  return navigate;
}

// --- useLocation ---

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();
  const searchString = searchParams.toString();
  return {
    pathname,
    search: searchString ? `?${searchString}` : '',
    hash: '',
    state: null,
    key: Math.random().toString(36).slice(2),
  };
}

// --- useParams ---

// Uses Next.js's real route params (from the file-based [slug] segments),
// and also exposes positional aliases for legacy code that read param0/param1.
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const nextParams = useNextParams();
  const params: Record<string, string> = {};
  const nextEntries = Object.entries(nextParams ?? {});
  for (const [key, value] of nextEntries) {
    if (typeof value === 'string') params[key] = value;
  }
  // Positional aliases (param0, param1, ...) in case legacy code depends on them.
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  segments.forEach((seg, i) => {
    params[`param${i}`] = seg;
  });
  return params as T;
}

// --- useSearchParams ---

// Returns [searchParams, setSearchParams] like react-router-dom.
// The navigation side effect (router.push) must happen OUTSIDE the setState
// updater: updaters run during React's render phase, and side effects there
// can be silently dropped under the Next.js App Router (clicks appear dead).
export function useSearchParams(
  initial?: Record<string, string> | URLSearchParams | undefined,
): [URLSearchParams, (params: Record<string, string> | URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useNextSearchParams();
  const urlSearchString = currentSearchParams.toString();

  const [state, setState] = useState<URLSearchParams>(() => {
    const sp = new URLSearchParams(urlSearchString);
    if (initial && !sp.toString()) {
      const init = initial instanceof URLSearchParams ? initial : new URLSearchParams(initial);
      init.forEach((v, k) => sp.set(k, v));
    }
    return sp;
  });

  // Re-sync when the URL changes externally (back/forward buttons, Link clicks).
  useEffect(() => {
    setState((prev) =>
      prev.toString() === urlSearchString ? prev : new URLSearchParams(urlSearchString),
    );
  }, [urlSearchString]);

  // Mirror of the latest state so rapid successive updates compose correctly
  // even before React re-renders or the navigation completes.
  const stateRef = useRef(state);
  stateRef.current = state;

  const setSearchParams = useCallback(
    (paramsOrUpdater: Record<string, string> | URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => {
      let next: URLSearchParams;
      if (typeof paramsOrUpdater === 'function') {
        const base = new URLSearchParams(stateRef.current);
        const result = paramsOrUpdater(base);
        next = result instanceof URLSearchParams ? result : base;
      } else if (paramsOrUpdater instanceof URLSearchParams) {
        next = new URLSearchParams(paramsOrUpdater);
      } else {
        next = new URLSearchParams();
        Object.entries(paramsOrUpdater).forEach(([k, v]) => next.set(k, v));
      }
      // Optimistic local update first (instant UI), then navigate.
      stateRef.current = next;
      setState(next);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return [state, setSearchParams];
}

// --- Navigate (redirect component) ---

interface NavigateProps {
  to: string;
  replace?: boolean;
  state?: unknown;
}

export function Navigate({ to, replace }: NavigateProps) {
  const router = useRouter();

  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [to, replace, router]);

  return null;
}

// --- RouteErrorFallback (replaces useRouteError, isRouteErrorResponse) ---

export function useRouteError(): unknown {
  // In Next.js, error boundaries are handled by error.tsx files
  return null;
}

export function isRouteErrorResponse(error: unknown): boolean {
  return false;
}

// --- createBrowserRouter (stub for compatibility — navigates via window.history) ---

interface RouterInstance {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

export function createBrowserRouter(_routes?: unknown[]): RouterInstance {
  return {
    navigate(to: string, opts?: { replace?: boolean }) {
      if (opts?.replace) {
        window.history.replaceState(null, '', to);
      } else {
        window.history.pushState(null, '', to);
      }
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
  };
}

// --- RouterProvider (stub — not used in Next.js) ---

export function RouterProvider() {
  // This is only used in the old App.tsx which gets replaced by Next.js root layout
  return null;
}

// --- Helpers ---

function filterAnchorProps(props: Record<string, unknown>): Record<string, unknown> {
  const anchorProps: Record<string, unknown> = {};
  const allowed = new Set(['target', 'rel', 'title', 'id', 'role', 'aria-label', 'aria-current', 'style', 'onMouseEnter', 'onMouseLeave']);
  for (const [key, value] of Object.entries(props)) {
    if (allowed.has(key)) {
      anchorProps[key] = value;
    }
  }
  return anchorProps;
}
