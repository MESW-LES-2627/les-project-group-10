import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getStudentProfile } from '@/api/students';
import type { StudentProfile } from '@/api/students';
import type { AuthContextValue } from '@/auth/authContext';
import { useAuth } from '@/auth/useAuth';
import StudentProfilePage from '@/pages/dashboard/StudentProfilePage';

vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/api/students', () => ({ getStudentProfile: vi.fn(), updateStudentProfile: vi.fn() }));

const student = {
  id: 'u1',
  username: 'Jane Doe',
  email: 'jane@example.com',
  isStudent: true,
  isMentor: false,
  onboardingFinished: false,
};
const profile: StudentProfile = {
  userId: 'u1',
  programme: 'MESW',
  enrollmentYear: 2023,
  studyLevel: "Master's",
  budgetMinCents: 3000,
  budgetMaxCents: 4500,
  categoryIds: ['c-db', 'c-ph'],
  categories: [
    { id: 'c-db', name: 'Databases' },
    { id: 'c-ph', name: 'Physics' },
  ],
};
const emptyProfile: StudentProfile = {
  userId: 'u1',
  programme: null,
  enrollmentYear: null,
  studyLevel: null,
  budgetMinCents: null,
  budgetMaxCents: null,
  categoryIds: [],
  categories: [],
};
let auth: AuthContextValue;

function open() {
  const memoryRouter = createMemoryRouter(
    [
      { path: '/dashboard', element: <p>Dashboard stub</p> },
      { path: '/dashboard/student', element: <StudentProfilePage /> },
      { path: '/dashboard/student/edit', element: <p>Edit stub</p> },
    ],
    { initialEntries: ['/dashboard/student'] },
  );
  render(<RouterProvider router={memoryRouter} />);
  return memoryRouter;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  auth = {
    user: student,
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  };
  vi.mocked(useAuth).mockImplementation(() => auth);
  vi.mocked(getStudentProfile).mockResolvedValue(profile);
});
afterEach(cleanup);

describe('student profile page', () => {
  it('shows the account details and every saved profile field', async () => {
    open();
    expect(await screen.findByText('MESW')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText("Master's")).toBeInTheDocument();
    expect(screen.getByText('€30.00 – €45.00')).toBeInTheDocument();
    expect(screen.getByText('Databases')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('shows "Not set yet" for every field a student has not filled in', async () => {
    vi.mocked(getStudentProfile).mockResolvedValue(emptyProfile);
    open();
    await waitFor(() => expect(screen.getAllByText('Not set yet')).toHaveLength(5));
  });

  it('describes a budget with only one end', async () => {
    vi.mocked(getStudentProfile).mockResolvedValue({
      ...emptyProfile,
      budgetMaxCents: 4500,
    });
    open();
    expect(await screen.findByText('Up to €45.00')).toBeInTheDocument();
  });

  it('shows an error when the profile cannot be loaded', async () => {
    vi.mocked(getStudentProfile).mockRejectedValue(new Error('offline'));
    open();
    expect(await screen.findByText('Could not load your profile')).toBeInTheDocument();
  });

  it('links the Edit profile button to the edit page', async () => {
    open();
    await screen.findByText('MESW');
    expect(screen.getByRole('link', { name: 'Edit profile' })).toHaveAttribute(
      'href',
      '/dashboard/student/edit',
    );
  });

  it('redirects an account without a student profile and never calls the API', async () => {
    auth = { ...auth, user: { ...student, isStudent: false, isMentor: true } };
    const router = open();
    await screen.findByText('Dashboard stub');
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(getStudentProfile).not.toHaveBeenCalled();
  });
});
