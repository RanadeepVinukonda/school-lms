import { describe, expect, it } from 'vitest';
import { getBackTarget } from '../backNavigation';

describe('getBackTarget', () => {
  it('does not add back navigation to parent pages', () => {
    expect(getBackTarget('/student/dashboard')).toBeNull();
    expect(getBackTarget('/teacher/textbooks')).toBeNull();
    expect(getBackTarget('/admin/hr')).toBeNull();
    expect(getBackTarget('/notifications')).toBeNull();
  });

  it('uses the parent route for nested pages', () => {
    expect(getBackTarget('/student/textbooks/123')).toEqual({ type: 'path', path: '/student/textbooks' });
    expect(getBackTarget('/teacher/textbooks/upload')).toEqual({ type: 'path', path: '/teacher/textbooks' });
    expect(getBackTarget('/admin/hr/leaves')).toEqual({ type: 'path', path: '/admin/hr' });
    expect(getBackTarget('/k2/flashcards/animals')).toEqual({ type: 'path', path: '/k2/flashcards' });
  });

  it('maps detail routes to their logical parent', () => {
    expect(getBackTarget('/student/chapters/tb-1/ch-1')).toEqual({ type: 'path', path: '/student/textbooks/tb-1' });
    expect(getBackTarget('/student/concepts/c-1/quiz')).toEqual({ type: 'path', path: '/student/concepts/c-1' });
    expect(getBackTarget('/student/assessments/a-1/take')).toEqual({ type: 'path', path: '/student/exams' });
    expect(getBackTarget('/assignments/a-1')).toEqual({ type: 'path', path: '/student/tasks' });
    expect(getBackTarget('/teacher/classes/class-1')).toEqual({ type: 'path', path: '/teacher/select-class' });
    expect(getBackTarget('/teacher/classes/class-1/subjects/sub-1')).toEqual({ type: 'path', path: '/teacher/classes/class-1' });
    expect(getBackTarget('/teacher/textbooks/tb-1/chapters/ch-1/concepts/c-1')).toEqual({ type: 'path', path: '/teacher/textbooks/tb-1' });
    expect(getBackTarget('/admin/transport/routes/route-1')).toEqual({ type: 'path', path: '/admin/transport' });
    expect(getBackTarget('/admin/profile/edit')).toEqual({ type: 'path', path: '/admin/dashboard' });
  });

  it('falls back to history when the parent cannot be derived', () => {
    expect(getBackTarget('/student/concepts/c-1')).toEqual({ type: 'history', fallback: '/student/textbooks' });
    expect(getBackTarget('/student/lessons/l-1')).toEqual({ type: 'history', fallback: '/student/tasks' });
    expect(getBackTarget('/quizzes/q-1/attempt')).toEqual({ type: 'history', fallback: '/student/tasks' });
  });
});
