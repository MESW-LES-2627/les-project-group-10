import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMentorSession, getMentorSessions } from '@/api/bookingHistory';
import type { MentorSession } from '@/api/bookingHistory';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { formatSessionPaymentStatus } from '@/lib/bookingHistory';
import MentorSessionDetailsPage from '@/pages/dashboard/MentorSessionDetailsPage';
import MentorSessionsPage from '@/pages/dashboard/MentorSessionsPage';

vi.mock('@/api/bookingHistory', () => ({ getMentorSession: vi.fn(), getMentorSessions: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));

const future: MentorSession = {
  id: 'future-id',
  student_name: 'Mariana Costa',
  service_title: 'Database tutoring',
  scheduled_at: '2030-07-01T14:00:00Z',
  duration_minutes: 60,
  status: 'confirmed',
  payment_status: 'succeeded',
};
const cancelled: MentorSession = {
  ...future,
  id: 'cancelled-id',
  service_title: 'SQL practice',
  status: 'cancelled',
  payment_status: 'failed',
};
const past: MentorSession = {
  ...future,
  id: 'past-id',
  service_title: 'Database fundamentals',
  scheduled_at: '2026-07-01T14:00:00Z',
};

const basePath = '/dashboard/mentor-sessions';

function open(path = basePath) {
  const router = createMemoryRouter(
    [
      { path: basePath, element: <MentorSessionsPage /> },
      { path: `${basePath}/:bookingId`, element: <MentorSessionDetailsPage /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'mentor-id',
      username: 'Mentor da Silva',
      email: 'mentor@example.com',
      isStudent: false,
      isMentor: true,
      isAdmin: false,
      onboardingFinished: true,
    },
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  });
  vi.mocked(getMentorSessions).mockResolvedValue({ upcoming: [future, cancelled], past: [past] });
  vi.mocked(getMentorSession).mockResolvedValue({ session: future });
});

describe('mentor session history', () => {
  it('shows upcoming and past sessions with their own booking and payment states', async () => {
    open();
    const upcoming = within(await screen.findByRole('region', { name: 'Upcoming sessions' }));
    const history = within(screen.getByRole('region', { name: 'Past sessions' }));
    const upcomingLink = upcoming.getByRole('link', { name: /database tutoring/i });
    expect(upcomingLink).toHaveTextContent(/booking\s*confirmed.*payment\s*succeeded \(test\)/i);
    expect(upcoming.getByRole('link', { name: /sql practice/i })).toHaveTextContent(
      /booking\s*cancelled.*payment\s*failed/i,
    );
    expect(history.getByRole('link', { name: /database fundamentals/i })).toHaveTextContent(
      /booking\s*confirmed/i,
    );
    expect(history.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('opens a session and displays the student, booked service, schedule, duration and statuses', async () => {
    open();
    await userEvent.click(await screen.findByRole('link', { name: /database tutoring/i }));
    expect(await screen.findByRole('heading', { name: future.service_title })).toBeInTheDocument();
    expect(getMentorSession).toHaveBeenCalledWith(future.id);
    expect(screen.getByText(future.student_name)).toBeInTheDocument();
    expect(screen.getByText(/1 Jul 2030.*15:00 Lisbon time/)).toHaveAttribute(
      'datetime',
      future.scheduled_at,
    );
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Succeeded (test)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Back to mentor sessions' }));
    expect(await screen.findByRole('region', { name: 'Upcoming sessions' })).toBeInTheDocument();
  });

  it('gives each empty section its own message', async () => {
    vi.mocked(getMentorSessions).mockResolvedValue({ upcoming: [], past: [] });
    open();
    expect(await screen.findByText('No upcoming sessions yet.')).toBeInTheDocument();
    expect(screen.getByText('No past sessions yet.')).toBeInTheDocument();
  });

  it('shows a load error when the API cannot be reached', async () => {
    vi.mocked(getMentorSessions).mockRejectedValue(new Error('offline'));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your sessions.');
    expect(screen.queryByText('No past sessions yet.')).not.toBeInTheDocument();
  });

  it('shows a generic message and no details for a private session', async () => {
    vi.mocked(getMentorSession).mockRejectedValue(new ApiError(404, 'Session not found'));
    open(`${basePath}/private-id`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Session not found.');
    expect(screen.queryByText('Payment status')).not.toBeInTheDocument();
  });
});

describe('mentor session payment status', () => {
  it.each([
    [null, 'Not attempted'],
    ['pending', 'Pending'],
    ['succeeded', 'Succeeded (test)'],
    ['failed', 'Failed'],
    ['expired', 'Expired'],
  ] as const)('labels %s as %s', (status, label) => {
    expect(formatSessionPaymentStatus(status)).toBe(label);
  });
});
