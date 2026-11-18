import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getCategories } from '@/api/categories';
import { ApiError } from '@/api/client';
import { updateStudentProfile } from '@/api/students';
import StudentInterestsStep from '@/pages/student-onboarding/StudentInterestsStep';
import StudentPreferencesStep from '@/pages/student-onboarding/StudentPreferencesStep';
import { StudentOnboardingProvider } from '@/pages/student-onboarding/StudentOnboardingProvider';

vi.mock('@/api/students', () => ({ getStudentProfile: vi.fn(), updateStudentProfile: vi.fn() }));
vi.mock('@/api/categories', () => ({ getCategories: vi.fn() }));

const categories = [
  { id: 'c-db', name: 'Databases' },
  { id: 'c-ph', name: 'Physics' },
];

function open() {
  const memoryRouter = createMemoryRouter(
    [
      {
        path: '/student-onboarding',
        element: <StudentOnboardingProvider />,
        children: [
          { path: 'interests', element: <StudentInterestsStep /> },
          { path: 'preferences', element: <StudentPreferencesStep /> },
          { path: 'all-set', element: <p>All set stub</p> },
        ],
      },
    ],
    { initialEntries: ['/student-onboarding/interests'] },
  );
  render(<RouterProvider router={memoryRouter} />);
  return memoryRouter;
}

/** Goes from the interests step to the preferences step, optionally picking chips first. */
async function toPreferences(...chips: string[]) {
  for (const chip of chips)
    await userEvent.click(await screen.findByRole('button', { name: chip }));
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('button', { name: 'Finish setup' });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(getCategories).mockResolvedValue(categories);
  vi.mocked(updateStudentProfile).mockResolvedValue({} as never);
});
afterEach(cleanup);

describe('student onboarding: interests step', () => {
  it('lists the subject areas from the database as selectable chips', async () => {
    open();
    const databases = await screen.findByRole('button', { name: 'Databases' });
    expect(screen.getByRole('button', { name: 'Physics' })).toBeInTheDocument();
    expect(databases).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(databases);
    expect(databases).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(databases);
    expect(databases).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers a retry when the subject areas cannot be loaded', async () => {
    vi.mocked(getCategories).mockRejectedValueOnce(new Error('offline'));
    open();
    expect(await screen.findByText(/Could not load the subject areas/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Databases' })).toBeInTheDocument();
  });
});

describe('student onboarding: saving', () => {
  it('sends every answer in one request at the end, with the budget in cents', async () => {
    const router = open();
    await toPreferences('Databases');
    // nothing is saved while the student is still answering
    expect(updateStudentProfile).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await screen.findByText('All set stub');
    expect(router.state.location.pathname).toBe('/student-onboarding/all-set');
    expect(updateStudentProfile).toHaveBeenCalledTimes(1);
    // study level was not chosen, so it is left out instead of cleared
    expect(updateStudentProfile).toHaveBeenCalledWith({
      budgetMinCents: 1500,
      budgetMaxCents: 4000,
      categoryIds: ['c-db'],
    });
  });

  it('leaves the interests out of the request when none were picked', async () => {
    open();
    await toPreferences();
    await userEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await screen.findByText('All set stub');
    expect(updateStudentProfile).toHaveBeenCalledWith(
      expect.not.objectContaining({ categoryIds: expect.anything() }),
    );
  });

  it('stays on the step and shows the server message when the save is rejected', async () => {
    vi.mocked(updateStudentProfile).mockRejectedValue(
      new ApiError(400, 'Invalid input', 'validation_error', {
        budgetMaxCents: 'Maximum budget is too high',
      }),
    );
    const router = open();
    await toPreferences();
    await userEvent.click(screen.getByRole('button', { name: 'Finish setup' }));

    expect(await screen.findByText('Maximum budget is too high')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/student-onboarding/preferences');
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeEnabled();
  });

  it('stays on the step with a generic message when the request fails', async () => {
    vi.mocked(updateStudentProfile).mockRejectedValue(new Error('offline'));
    const router = open();
    await toPreferences();
    await userEvent.click(screen.getByRole('button', { name: 'Finish setup' }));

    expect(
      await screen.findByText('Could not save your answers. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/student-onboarding/preferences');
  });
});
