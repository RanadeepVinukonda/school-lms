import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/firebase/config', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { useAuthStore } from '@/store/authStore';

describe('Route Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect unauthenticated users to login', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasRole: () => false,
    });

    const { ProtectedRoute } = require('@/app/router/ProtectedRoute');
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.textContent).not.toContain('Admin Content');
  });

  it('should render admin content for admin users', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '1', role: 'admin', email: 'admin@test.com', displayName: 'Admin' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      hasRole: (roles: string[]) => roles.includes('admin'),
    });

    const { ProtectedRoute } = require('@/app/router/ProtectedRoute');
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.textContent).toContain('Admin Content');
  });

  it('should block teacher from admin routes', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '2', role: 'teacher', email: 'teacher@test.com', displayName: 'Teacher' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      hasRole: (roles: string[]) => roles.includes('teacher'),
    });

    const { ProtectedRoute } = require('@/app/router/ProtectedRoute');
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.textContent).not.toContain('Admin Content');
  });

  it('should block student from teacher routes', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '3', role: 'student', email: 'student@test.com', displayName: 'Student' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      hasRole: (roles: string[]) => roles.includes('student'),
    });

    const { ProtectedRoute } = require('@/app/router/ProtectedRoute');
    const { container } = render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <ProtectedRoute roles={['teacher']}>
          <div>Teacher Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.textContent).not.toContain('Teacher Content');
  });

  it('should allow super_admin access to admin routes', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '4', role: 'super_admin', email: 'super@test.com', displayName: 'Super Admin' },
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      hasRole: (roles: string[]) => roles.includes('super_admin'),
    });

    const { ProtectedRoute } = require('@/app/router/ProtectedRoute');
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <ProtectedRoute roles={['admin', 'super_admin']}>
          <div>Super Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(container.textContent).toContain('Super Admin Content');
  });
});
