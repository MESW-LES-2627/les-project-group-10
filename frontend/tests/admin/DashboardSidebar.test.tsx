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

const hiddenForAdmin = ['Sessions', 'Mentor sessions', 'Saved mentors', 'Settings'];
const sharedItems = ['Overview', 'Find a mentor', 'Messages'];

afterEach(cleanup);

describe('dashboard sidebar by role', () => {
  it('shows Users and hides session links, Saved mentors and Settings for an admin', () => {
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

  it('shows the student sessions link and student profile for a student', () => {
    renderSidebar({ isStudent: true });
    for (const label of [...sharedItems, 'Saved mentors', 'Settings', 'Student profile']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: /^Sessions$/ })).toHaveAttribute(
      'href',
      '/dashboard#sessions',
    );
    expect(screen.queryByRole('link', { name: 'Mentor sessions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('shows the mentor sessions link and mentor tools for a mentor', () => {
    renderSidebar({ isMentor: true });
    for (const label of [
      ...sharedItems,
      'Saved mentors',
      'Settings',
      'My profile',
      'Availability slots',
      'Services & fees',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Mentor sessions' })).toHaveAttribute(
      'href',
      '/dashboard/mentor-sessions',
    );
    expect(screen.queryByRole('link', { name: /^Sessions$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });

  it('shows both session links to an account that is both a student and a mentor', () => {
    renderSidebar({ isStudent: true, isMentor: true });
    expect(screen.getByRole('link', { name: /^Sessions$/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mentor sessions' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
  });
});
