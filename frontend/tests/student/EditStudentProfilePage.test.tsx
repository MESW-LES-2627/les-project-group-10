import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getCategories } from '@/api/categories';
import { ApiError } from '@/api/client';
import { getStudentProfile, updateStudentProfile } from '@/api/students';
import type { StudentProfile } from '@/api/students';
import type { AuthContextValue } from '@/auth/authContext';
import { useAuth } from '@/auth/useAuth';
import EditStudentProfilePage from '@/pages/dashboard/EditStudentProfilePage';

vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/api/students', () => ({ getStudentProfile: vi.fn(), updateStudentProfile: vi.fn() }));
vi.mock('@/api/categories', () => ({ getCategories: vi.fn() }));

const student = {
  id: 'u1',
  username: 'Jane Doe',
  email: 'jane@example.com',
  isStudent: true,
  isMentor: false,
  onboardingFinished: false,
};
const categories = [
  { id: 'c-db', name: 'Databases' },
  { id: 'c-ph', name: 'Physics' },
  { id: 'c-ma', name: 'Mathematics' },
];
const profile: StudentProfile = {
  userId: 'u1',
  programme: 'MESW',
  enrollmentYear: 2023,
  studyLevel: "Master's",
  budgetMinCents: 2000,
  budgetMaxCents: 4000,
  categoryIds: ['c-db', 'c-ph'],
  categories: categories.slice(0, 2),
};
let auth: AuthContextValue;

function open() {
  const memoryRouter = createMemoryRouter(
    [
      { path: '/dashboard', element: <p>Dashboard stub</p> },
      { path: '/dashboard/student', element: <p>Profile stub</p> },
      { path: '/dashboard/student/edit', element: <EditStudentProfilePage /> },
    ],
    { initialEntries: ['/dashboard/student/edit'] },
  );
  render(<RouterProvider router={memoryRouter} />);
  return memoryRouter;
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

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
  vi.mocked(getCategories).mockResolvedValue(categories);
  vi.mocked(updateStudentProfile).mockResolvedValue(profile);
});
afterEach(cleanup);

describe('edit student profile page', () => {
  it('pre-fills the form from the saved profile', async () => {
    open();
    expect(await screen.findByLabelText('Programme (Course Name)')).toHaveValue('MESW');
    expect(screen.getByLabelText('Enrollment year')).toHaveValue('2023');
    expect(screen.getByText("Master's")).toBeInTheDocument();
    expect(screen.getByText('€20 – €40')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Databases' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mathematics' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('saves the changes in one request and returns to the profile', async () => {
    const router = open();
    const programme = await screen.findByLabelText('Programme (Course Name)');
    await userEvent.clear(programme);
    await userEvent.type(programme, 'L.EIC');
    await userEvent.click(await screen.findByRole('button', { name: 'Physics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mathematics' }));
    await save();

    await screen.findByText('Profile stub');
    expect(router.state.location.pathname).toBe('/dashboard/student');
    // budget is not sent because the slider was never moved
    expect(updateStudentProfile).toHaveBeenCalledTimes(1);
    expect(updateStudentProfile).toHaveBeenCalledWith({
      programme: 'L.EIC',
      enrollmentYear: 2023,
      studyLevel: "Master's",
      categoryIds: ['c-db', 'c-ma'],
    });
  });

  it('sends the budget in cents once the slider has been moved', async () => {
    open();
    const min = await screen.findByLabelText('Budget per session minimum');
    fireEvent.change(min, { target: { value: '30' } });
    await save();

    await screen.findByText('Profile stub');
    expect(updateStudentProfile).toHaveBeenCalledWith(
      expect.objectContaining({ budgetMinCents: 3000, budgetMaxCents: 4000 }),
    );
  });

  it('changes the study level from the dropdown', async () => {
    open();
    await userEvent.click(await screen.findByLabelText('Study level'));
    await userEvent.click(screen.getByRole('option', { name: 'PhD' }));
    await save();

    await screen.findByText('Profile stub');
    expect(updateStudentProfile).toHaveBeenCalledWith(
      expect.objectContaining({ studyLevel: 'PhD' }),
    );
  });

  it('clears programme and enrollment year by sending null', async () => {
    open();
    await userEvent.clear(await screen.findByLabelText('Programme (Course Name)'));
    await userEvent.clear(screen.getByLabelText('Enrollment year'));
    await save();

    await screen.findByText('Profile stub');
    expect(updateStudentProfile).toHaveBeenCalledWith(
      expect.objectContaining({ programme: null, enrollmentYear: null }),
    );
  });

  it('rejects an enrollment year that is not four digits before sending anything', async () => {
    open();
    const year = await screen.findByLabelText('Enrollment year');
    await userEvent.clear(year);
    await userEvent.type(year, '20x4');
    await save();

    expect(
      await screen.findByText('Enter a four-digit year, for example 2024'),
    ).toBeInTheDocument();
    expect(updateStudentProfile).not.toHaveBeenCalled();
  });

  it('shows the server message next to the field and keeps the form', async () => {
    vi.mocked(updateStudentProfile).mockRejectedValue(
      new ApiError(400, 'Invalid input', 'validation_error', {
        enrollmentYear: 'Enrollment year must be 2000 or later',
      }),
    );
    const router = open();
    await screen.findByLabelText('Programme (Course Name)');
    await save();

    expect(await screen.findByText('Enrollment year must be 2000 or later')).toBeInTheDocument();
    expect(screen.getByText('Check the highlighted fields.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/student/edit');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('shows a generic message when the save fails without a field error', async () => {
    vi.mocked(updateStudentProfile).mockRejectedValue(new Error('offline'));
    const router = open();
    await screen.findByLabelText('Programme (Course Name)');
    await save();

    expect(
      await screen.findByText('Could not save your changes. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/student/edit');
  });

  it('leaves saved interests untouched when the subject areas cannot be loaded', async () => {
    vi.mocked(getCategories).mockRejectedValueOnce(new Error('offline'));
    open();
    expect(await screen.findByText(/Could not load the subject areas/)).toBeInTheDocument();
    await save();

    await screen.findByText('Profile stub');
    expect(updateStudentProfile).toHaveBeenCalledWith(
      expect.not.objectContaining({ categoryIds: expect.anything() }),
    );
  });

  it('retries loading the subject areas', async () => {
    vi.mocked(getCategories).mockRejectedValueOnce(new Error('offline'));
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Databases' })).toBeInTheDocument();
  });

  it('retries loading the profile after a failure', async () => {
    vi.mocked(getStudentProfile).mockRejectedValueOnce(new Error('offline'));
    open();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Programme (Course Name)')).toHaveValue('MESW');
  });

  it('cancels without saving', async () => {
    const router = open();
    await userEvent.type(await screen.findByLabelText('Programme (Course Name)'), ' changed');
    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }));

    await screen.findByText('Profile stub');
    expect(router.state.location.pathname).toBe('/dashboard/student');
    expect(updateStudentProfile).not.toHaveBeenCalled();
  });

  it('redirects an account without a student profile and never calls the API', async () => {
    auth = { ...auth, user: { ...student, isStudent: false, isMentor: true } };
    const router = open();
    await screen.findByText('Dashboard stub');
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(getStudentProfile).not.toHaveBeenCalled();
  });
});
