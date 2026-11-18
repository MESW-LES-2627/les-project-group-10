import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookingRecord, StripeCheckout } from '@/api/bookings';
import {
  createStripeCheckout,
  getBooking,
  getStripeCheckout,
  getStripeConfig,
  retryStripeCheckout,
} from '@/api/bookings';
import { ApiError } from '@/api/client';
import BookingConfirmedPage from '@/pages/mentors/BookingConfirmedPage';
import CheckoutPage from '@/pages/mentors/CheckoutPage';

const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn() }));

vi.mock('@/api/bookings', () => ({
  createStripeCheckout: vi.fn(),
  getBooking: vi.fn(),
  getStripeCheckout: vi.fn(),
  getStripeConfig: vi.fn(),
  retryStripeCheckout: vi.fn(),
}));
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({ user: { username: 'Sample Student', email: 'student@example.test' } }),
}));
vi.mock('@/layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: async () => stripe,
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  PaymentElement: () => <div>Stripe test form</div>,
  useStripe: () => stripe,
  useElements: () => ({}),
}));

const booking: BookingRecord = {
  id: 'booking-1',
  status: 'pending_payment',
  scheduled_at: '2026-11-20T18:00:00.000Z',
  payment_status: 'pending',
  amount_cents: 4450,
  service_id: 'service-1',
  service_title: 'Booked mock interview',
  service_price_cents: 4300,
  duration_minutes: 45,
  mentor_id: 'mentor-1',
  mentor_name: 'Jane Doe',
  mentor_headline: 'Engineer',
};

const checkoutPath = '/mentors/mentor-1/checkout';
const confirmationPath = '/mentors/mentor-1/booked';

function attempt(
  paymentStatus: BookingRecord['payment_status'],
  attemptId = 'attempt-1',
): StripeCheckout {
  const status = {
    pending: 'pending_payment',
    succeeded: 'confirmed',
    failed: 'cancelled',
    expired: 'cancelled',
  } as const;
  return {
    booking: { ...booking, status: status[paymentStatus], payment_status: paymentStatus },
    attemptId,
    clientSecret: paymentStatus === 'pending' ? 'test-form-secret' : null,
  };
}

function renderCheckoutPage(entry: string) {
  const router = createMemoryRouter(
    [
      { path: '/mentors/:mentorId/checkout', element: <CheckoutPage /> },
      { path: '/mentors/:mentorId/booked', element: <BookingConfirmedPage /> },
    ],
    { initialEntries: [entry] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getStripeConfig).mockResolvedValue({ publishableKey: 'pk_test_example' });
});

describe('recoverable checkout', () => {
  it('replays the same start request after losing its response and reloading', async () => {
    vi.mocked(createStripeCheckout).mockRejectedValueOnce(new TypeError('Network unavailable'));
    vi.mocked(createStripeCheckout).mockResolvedValueOnce(attempt('pending'));
    vi.mocked(getStripeCheckout).mockResolvedValue(attempt('pending'));

    const { router, unmount } = renderCheckoutPage(
      `${checkoutPath}?service=service-1&date=2026-11-20&time=18%3A00`,
    );
    await screen.findByRole('button', { name: 'Try again' });
    const persistedSearch = router.state.location.search;
    const storedKey = new URLSearchParams(persistedSearch).get('checkoutKey');
    expect(storedKey).toBeTruthy();
    unmount();

    const resumed = renderCheckoutPage(`${checkoutPath}${persistedSearch}`);
    expect(await screen.findByRole('button', { name: /pay €44\.50/i })).toBeEnabled();
    expect(createStripeCheckout).toHaveBeenCalledTimes(2);
    expect(createStripeCheckout).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: storedKey }),
    );
    expect(createStripeCheckout).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: storedKey }),
    );
    expect(resumed.router.state.location.search).toBe('?bookingId=booking-1');
    expect(screen.getByText('Booked mock interview')).toBeInTheDocument();
  });

  it('shows a new payment form after explicitly retrying a failed attempt', async () => {
    vi.mocked(getStripeCheckout)
      .mockResolvedValueOnce(attempt('failed'))
      .mockResolvedValue(attempt('pending', 'attempt-2'));
    vi.mocked(retryStripeCheckout).mockResolvedValueOnce(attempt('pending', 'attempt-2'));

    renderCheckoutPage(`${checkoutPath}?bookingId=booking-1`);
    expect(await screen.findByRole('heading', { name: 'Payment failed' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry payment' }));

    expect(retryStripeCheckout).toHaveBeenCalledExactlyOnceWith('booking-1', 'attempt-1');
    expect(await screen.findByRole('button', { name: /pay €44\.50/i })).toBeEnabled();
    expect(createStripeCheckout).not.toHaveBeenCalled();
  });

  it('offers another time when an expired reservation cannot be retried', async () => {
    vi.mocked(getStripeCheckout).mockResolvedValue(attempt('expired'));
    vi.mocked(retryStripeCheckout).mockRejectedValue(
      new ApiError(409, 'Slot taken', 'slot_unavailable'),
    );

    renderCheckoutPage(`${checkoutPath}?bookingId=booking-1`);
    expect(await screen.findByRole('heading', { name: 'Reservation expired' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry payment' }));

    const link = await screen.findByRole('link', { name: 'Choose another time' });
    expect(link).toHaveAttribute('href', '/mentors/mentor-1');
    expect(screen.getByRole('alert')).toHaveTextContent('That time is no longer available.');
    expect(screen.queryByRole('button', { name: 'Retry payment' })).not.toBeInTheDocument();
  });

  it('checks the persisted result immediately when Stripe reports a decline', async () => {
    vi.mocked(getStripeCheckout)
      .mockResolvedValueOnce(attempt('pending'))
      .mockResolvedValue(attempt('failed'));
    stripe.confirmPayment.mockResolvedValueOnce({ error: { message: 'Card declined' } });

    renderCheckoutPage(`${checkoutPath}?bookingId=booking-1`);
    await userEvent.click(await screen.findByRole('button', { name: /pay €44\.50/i }));

    expect(await screen.findByRole('heading', { name: 'Payment failed' })).toBeInTheDocument();
    expect(getStripeCheckout).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Retry payment' })).toBeEnabled();
  });

  it('ignores the redirect success flag until the backend confirms the booking', async () => {
    vi.mocked(getBooking)
      .mockResolvedValueOnce({ booking })
      .mockResolvedValue({ booking: attempt('succeeded').booking });

    const { router } = renderCheckoutPage(
      `${confirmationPath}?bookingId=booking-1&payment_intent=pi_demo&payment_intent_client_secret=pi_demo_secret&redirect_status=succeeded`,
    );
    expect(await screen.findByRole('link', { name: 'Return to checkout' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /booked!/i })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?bookingId=booking-1');

    expect(
      await screen.findByRole('heading', { name: /booked!/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
