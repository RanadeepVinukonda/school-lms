export const NAVIGATE_EVENT = 'genesis:navigate';

export type BackTarget =
  | { type: 'path'; path: string }
  | { type: 'history'; fallback?: string };

type Rule = {
  pattern: RegExp;
  target: (match: RegExpExecArray) => BackTarget;
};

const RULES: Rule[] = [
  {
    pattern: /^\/assignments\/[^/]+$/,
    target: () => ({ type: 'path', path: '/student/tasks' }),
  },
  {
    pattern: /^\/quizzes\/[^/]+\/attempt$/,
    target: () => ({ type: 'history', fallback: '/student/tasks' }),
  },
  {
    pattern: /^\/student\/chapters\/([^/]+)\/[^/]+$/,
    target: (m) => ({ type: 'path', path: `/student/textbooks/${m[1]}` }),
  },
  {
    pattern: /^\/student\/concepts\/([^/]+)\/(quiz|adaptive-quiz)$/,
    target: (m) => ({ type: 'path', path: `/student/concepts/${m[1]}` }),
  },
  {
    pattern: /^\/student\/assessments\/[^/]+\/take$/,
    target: () => ({ type: 'path', path: '/student/exams' }),
  },
  {
    pattern: /^\/student\/concepts\/[^/]+$/,
    target: () => ({ type: 'history', fallback: '/student/textbooks' }),
  },
  {
    pattern: /^\/student\/lessons\/[^/]+$/,
    target: () => ({ type: 'history', fallback: '/student/tasks' }),
  },
  {
    pattern: /^\/teacher\/classes\/([^/]+)\/subjects\/[^/]+$/,
    target: (m) => ({ type: 'path', path: `/teacher/classes/${m[1]}` }),
  },
  {
    pattern: /^\/teacher\/classes\/[^/]+$/,
    target: () => ({ type: 'path', path: '/teacher/select-class' }),
  },
  {
    pattern: /^\/teacher\/textbooks\/([^/]+)\/chapters\/[^/]+\/concepts\/[^/]+$/,
    target: (m) => ({ type: 'path', path: `/teacher/textbooks/${m[1]}` }),
  },
  {
    pattern: /^\/teacher\/exams\/[^/]+\/correct$/,
    target: () => ({ type: 'path', path: '/teacher/exams' }),
  },
  {
    pattern: /^\/admin\/transport\/routes\/[^/]+$/,
    target: () => ({ type: 'path', path: '/admin/transport' }),
  },
  {
    pattern: /^\/admin\/profile\/edit$/,
    target: () => ({ type: 'path', path: '/admin/dashboard' }),
  },
];

function normalize(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.replace(/\/+$/, '');
  }
  return withoutQuery || '/';
}

export function getBackTarget(pathname: string): BackTarget | null {
  const path = normalize(pathname);
  for (const rule of RULES) {
    const match = rule.pattern.exec(path);
    if (match) return rule.target(match);
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length < 3) return null;
  return { type: 'path', path: `/${segments.slice(0, -1).join('/')}` };
}

function navigateTo(path: string): void {
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: path }));
}

export function requestBack(pathname?: string): boolean {
  if (typeof window === 'undefined') return false;
  const target = getBackTarget(pathname ?? window.location.pathname);
  if (!target) return false;

  if (target.type === 'path') {
    navigateTo(target.path);
    return true;
  }

  if (window.history.length > 1) {
    window.history.back();
    return true;
  }

  if (target.fallback) {
    navigateTo(target.fallback);
    return true;
  }

  return false;
}
