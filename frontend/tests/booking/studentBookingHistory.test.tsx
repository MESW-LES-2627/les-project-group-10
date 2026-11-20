import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookingHistory, getBookingHistoryDetails } from '@/api/bookingHistory';
import type { BookingHistorySummary, PaymentAttempt } from '@/api/bookingHistory';
import { getUpcomingBookings } from '@/api/bookings';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import StudentBookingDetailsPage from '@/pages/dashboard/StudentBookingDetailsPage';
import StudentDashboardPage from '@/pages/dashboard/StudentDashboardPage';

vi.mock('@/api/bookingHistory', () => ({
  getBookingHistory: vi.fn(),
  getBookingHistoryDetails: vi.fn(),
}));
vi.mock('@/api/bookings', () => ({ getUpcomingBookings: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({ useAuth: vi.fn() }));

const pastBooking: BookingHistorySummary = {
  id: 'past-id',
  status: 'confirmed',
  scheduled_at: '2026-07-01T14:00:00Z',
  service_title: 'Database tutoring',
  duration_minutes: 60,
  service_price_cents: 3000,
  mentor_name: 'Mentor da Silva',
};
const futureBooking: BookingHistorySummary = {
  ...pastBooking,
  id: 'future-id',
  status: 'cancelled',
  scheduled_at: '2030-07-01T14:00:00Z',
  service_title: 'SQL practice',
};
const expired: PaymentAttempt = {
  id: 'expired-id',
  status: 'expired',
  amount_cents: 3150,
  currency: 'eur',
  created_at: '2026-07-01T13:50:00Z',
};
const failed: PaymentAttempt = {
  ...expired,
  id: 'failed-id',
  status: 'failed',
  amount_cents: 2650,
  created_at: '2026-07-01T13:30:00Z',
};

function open(path = '/dashboard') {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', element: <StudentDashboardPage /> },
      { path: '/dashboard/bookings/:bookingId', element: <StudentBookingDetailsPage /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'student-id',
      username: 'Student da Silva',
      email: 'student@example.com',
      isStudent: true,
      isMentor: false,
      isAdmin: false,
      onboardingFinished: false,
    },
    loading: false,
    refresh: vi.fn(),
    login: vi.fn(),
    registerStudent: vi.fn(),
    registerMentor: vi.fn(),
    logout: vi.fn(),
  });
  vi.mocked(getUpcomingBookings).mockResolvedValue({ bookings: [] });
  vi.mocked(getBookingHistory).mockResolvedValue({
    pastBookings: [pastBooking],
    paymentBookings: [{ ...futureBooking, latest_payment: expired }],
  });
  vi.mocked(getBookingHistoryDetails).mockResolvedValue({
    booking: { ...futureBooking, payments: [expired, failed] },
  });
});

describe('student booking history', () => {
  it('shows past bookings and an expired payment for a future session in their own sections', async () => {
    open();
    const past = within(screen.getByRole('region', { name: 'Past sessions' }));
    const payments = within(screen.getByRole('region', { name: 'Payment history' }));
    const pastLink = await past.findByRole('link', { name: /database tutoring/i });
    expect(pastLink).toHaveAttribute('href', '/dashboard/bookings/past-id');
    expect(past.getByText('Mentor da Silva')).toBeInTheDocument();
    expect(past.getByText('Confirmed')).toBeInTheDocument();
    expect(past.getByText(/15:00 Lisbon time/)).toBeInTheDocument();
    expect(past.queryByText('SQL practice')).not.toBeInTheDocument();

    await userEvent.click(payments.getByRole('link', { name: /sql practice/i }));
    expect(await screen.findByRole('heading', { name: 'SQL practice' })).toBeInTheDocument();
    expect(getBookingHistoryDetails).toHaveBeenCalledWith('future-id');
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
    const attempts = within(screen.getByRole('region', { name: 'Payment attempts' }));
    const rows = attempts.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/EUR\s+31\.50.*14:50 Lisbon time.*Expired/);
    expect(rows[1]).toHaveTextContent(/EUR\s+26\.50.*14:30 Lisbon time.*Failed/);
  });

  it('shows empty dashboard sections when no history exists', async () => {
    vi.mocked(getBookingHistory).mockResolvedValue({ pastBookings: [], paymentBookings: [] });
    open();
    expect(await screen.findByText('No past sessions yet.')).toBeInTheDocument();
    expect(screen.getByText('No payment attempts yet.')).toBeInTheDocument();
  });

  it('distinguishes a load error from an empty history', async () => {
    vi.mocked(getBookingHistory).mockRejectedValue(new Error('offline'));
    open();
    expect(await screen.findByText(/could not load your past sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/could not load your payment history/i)).toBeInTheDocument();
    expect(screen.queryByText('No past sessions yet.')).not.toBeInTheDocument();
  });

  it('loads the details again when reopened and renders the saved status', async () => {
    const firstView = open('/dashboard/bookings/future-id');
    expect(await screen.findByText('Expired')).toBeInTheDocument();
    firstView.unmount();
    vi.mocked(getBookingHistoryDetails).mockResolvedValue({
      booking: {
        ...futureBooking,
        status: 'confirmed',
        payments: [{ ...expired, status: 'succeeded' }],
      },
    });
    open('/dashboard/bookings/future-id');

    expect(await screen.findByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
  });

  it('shows no booking details when the requested booking belongs to another student', async () => {
    vi.mocked(getBookingHistoryDetails).mockRejectedValue(new ApiError(404, 'Booking not found'));
    open('/dashboard/bookings/private-id');
    expect(await screen.findByRole('alert')).toHaveTextContent('Booking not found.');
    expect(screen.queryByRole('heading', { name: 'Payment attempts' })).not.toBeInTheDocument();
  });
});
