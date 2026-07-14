import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    user: { id: '1', role: 'admin', email: 'admin@test.com', displayName: 'Admin' },
    token: 'token',
    isAuthenticated: true,
  }),
}));

vi.mock('@/supabase/config', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: { items: [] } } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import AdminAcademicYearsPage from '@/app/pages/admin/AdminAcademicYearsPage';

describe('Admin Academic Years Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page without crashing', () => {
    const { container } = render(
      <HelmetProvider>
        <AdminAcademicYearsPage />
      </HelmetProvider>
    );
    expect(container).toBeDefined();
  });

  it('should display the title', () => {
    render(
      <HelmetProvider>
        <AdminAcademicYearsPage />
      </HelmetProvider>
    );
    expect(screen.getByText('Academic Years')).toBeDefined();
  });

  it('should show add year button', () => {
    render(
      <HelmetProvider>
        <AdminAcademicYearsPage />
      </HelmetProvider>
    );
    const addButton = screen.getByText('Add Year');
    expect(addButton).toBeDefined();
  });

  it('should render with empty state', () => {
    const { container } = render(
      <HelmetProvider>
        <AdminAcademicYearsPage />
      </HelmetProvider>
    );
    expect(container.textContent).toContain('No academic years');
  });
});
