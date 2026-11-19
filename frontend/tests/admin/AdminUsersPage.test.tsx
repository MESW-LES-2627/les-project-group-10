import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getAdminMentors, getAdminStudents } from '@/api/admin';
import type { AdminMentor, AdminStudent, AdminUserPage } from '@/api/admin';
import type { AuthContextValue } from '@/auth/authContext';
import { useAuth } from '@/auth/useAuth';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';

vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/api/admin', () => ({ getAdminStudents: vi.fn(), getAdminMentors: vi.fn() }));

const admin = {
  id: 'admin-1',
  username: 'Platform Admin',
  email: 'admin@example.com',
  isStudent: false,
  isMentor: false,
  isAdmin: true,
  onboardingFinished: false,
};

const ana: AdminStudent = {
  id: 'id-ana',
  username: 'Ana Silva',
  email: 'ana@example.com',
  isBanned: false,
  createdAt: '2026-03-10T12:00:00Z',
  alsoMentor: true,
};
const carlos: AdminStudent = {
  id: 'id-carlos',
  username: 'Carlos Mendes',
  email: 'carlos@example.com',
  isBanned: true,
  createdAt: '2026-03-09T12:00:00Z',
  alsoMentor: false,
};
const rui: AdminMentor = {
  id: 'id-rui',
  username: 'Rui Costa',
  email: 'rui@example.com',
  isBanned: false,
  createdAt: '2026-02-01T12:00:00Z',
  alsoStudent: false,
};

function pageOf<T>(users: T[], overrides: Partial<AdminUserPage<T>> = {}): AdminUserPage<T> {
  return { users, page: 1, pageSize: 20, total: users.length, ...overrides };
}

let auth: AuthContextValue;

function open() {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', element: <p>Dashboard stub</p> },
      { path: '/dashboard/admin/users', element: <AdminUsersPage /> },
    ],
    { initialEntries: ['/dashboard/admin/users'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  auth = {
    user: admin,
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(useAuth).mockImplementation(() => auth);
  vi.mocked(getAdminStudents).mockResolvedValue(pageOf([ana, carlos]));
  vi.mocked(getAdminMentors).mockResolvedValue(pageOf([rui]));
});
afterEach(cleanup);

describe('admin users page', () => {
  it('lists the students with name, email, id, status, created date and the other role', async () => {
    open();
    const row = (await screen.findByText('Ana Silva')).closest('tr') as HTMLElement;
    expect(within(row).getByText('ana@example.com')).toBeInTheDocument();
    expect(within(row).getByText('id-ana')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(within(row).getByText(/Mar 2026/)).toBeInTheDocument();
    expect(within(row).getByText('Yes')).toBeInTheDocument();

    const banned = screen.getByText('Carlos Mendes').closest('tr') as HTMLElement;
    expect(within(banned).getByText('Banned')).toBeInTheDocument();
    expect(within(banned).getByText('No')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Also mentor' })).toBeInTheDocument();
    expect(getAdminStudents).toHaveBeenCalledWith(1, 20);
  });

  it('shows the Mentors tab with the "Also student" column after switching tabs', async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText('Ana Silva');
    await user.click(screen.getByRole('tab', { name: 'Mentors' }));

    expect(await screen.findByText('Rui Costa')).toBeInTheDocument();
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Also student' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mentors' })).toHaveAttribute('aria-selected', 'true');
    expect(getAdminMentors).toHaveBeenCalledWith(1, 20);
  });

  it('shows a loading message until the first page arrives', async () => {
    vi.mocked(getAdminStudents).mockReturnValue(new Promise(() => {}));
    open();
    expect(await screen.findByRole('status')).toHaveTextContent('Loading users');
  });

  it('shows an empty state when there are no users', async () => {
    vi.mocked(getAdminStudents).mockResolvedValue(pageOf<AdminStudent>([]));
    open();
    expect(await screen.findByText('No students to show.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error state, and Retry loads the list again', async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminStudents).mockRejectedValueOnce(new Error('network'));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the users');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getAdminStudents).toHaveBeenCalledTimes(2);
  });

  it('pages through the list: Previous is off on page 1, Next is off on the last page', async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminStudents).mockImplementation(async (page) =>
      page === 1 ? pageOf([ana], { page: 1, total: 25 }) : pageOf([carlos], { page: 2, total: 25 }),
    );
    open();

    expect(await screen.findByText('Page 1 of 2 · 25 users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Carlos Mendes')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2 · 25 users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(getAdminStudents).toHaveBeenLastCalledWith(2, 20);

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(getAdminStudents).toHaveBeenLastCalledWith(1, 20);
  });

  it('goes back to page 1 when the tab changes', async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminStudents).mockImplementation(async (page) =>
      pageOf([page === 1 ? ana : carlos], { page, total: 25 }),
    );
    open();
    await screen.findByText('Ana Silva');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Carlos Mendes');

    await user.click(screen.getByRole('tab', { name: 'Mentors' }));
    await screen.findByText('Rui Costa');
    expect(getAdminMentors).toHaveBeenLastCalledWith(1, 20);
  });

  it('redirects a user who is not an admin and never calls the API', async () => {
    auth = { ...auth, user: { ...admin, isAdmin: false, isStudent: true } };
    const router = open();
    await screen.findByText('Dashboard stub');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(getAdminStudents).not.toHaveBeenCalled();
    expect(getAdminMentors).not.toHaveBeenCalled();
  });
});
