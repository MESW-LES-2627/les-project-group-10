import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import type { AuthContextValue } from '@/auth/authContext';
import type { AuthUser } from '@/api/auth';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { renderWithProviders } from '../support/render';

const base: AuthUser = {
  id: 'u1',
  username: 'Jane Doe',
  email: 'jane@example.com',
  isStudent: false,
  isMentor: false,
  isAdmin: false,
  onboardingFinished: false,
};

function renderSidebar(overrides: Partial<AuthUser>) {
  const authValue: AuthContextValue = {
    user: { ...base, ...overrides },
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  };
  renderWithProviders(<DashboardSidebar open onNavigate={() => {}} />, { authValue });
}

const hiddenForAdmin = ['Sessions', 'Saved mentors', 'Settings'];
const sharedItems = ['Overview', 'Find a mentor', 'Messages'];

afterEach(cleanup);

describe('dashboard sidebar for admins', () => {
  it('hides Sessions, Saved mentors and Settings for an admin', () => {
    renderSidebar({ isAdmin: true });
    for (const label of hiddenForAdmin) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    for (const label of sharedItems) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/dashboard/admin/users',
    );
  });

  it('shows every shared item and no Users link to a student who is not an admin', () => {
    renderSidebar({ isStudent: true });
    for (const label of [...hiddenForAdmin, ...sharedItems]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('shows every shared item and no Users link to a mentor who is not an admin', () => {
    renderSidebar({ isMentor: true });
    for (const label of [...hiddenForAdmin, ...sharedItems]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });
});
