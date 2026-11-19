import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, buttonVariants } from '@/components/ui';
import { CheckoutNotice, CheckoutPayment } from '@/components/mentors/CheckoutPayment';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { createStripeCheckout, getStripeCheckout, retryStripeCheckout } from '@/api/bookings';
import type { StripeCheckout, StripeCheckoutInput } from '@/api/bookings';
import { ApiError } from '@/api/client';
import { bookingConfirmationPath } from '@/lib/booking';

export default function CheckoutPage() {
  const { mentorId = '' } = useParams();
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId');
  const serviceId = params.get('service');
  const date = params.get('date');
  const time = params.get('time');

  return (
    <DashboardLayout title="Checkout">
      {bookingId ? (
        <CheckoutAttempt key={bookingId} bookingId={bookingId} />
      ) : serviceId && date && time ? (
        <StartCheckout
          key={params.toString()}
          mentorId={mentorId}
          serviceId={serviceId}
          date={date}
          time={time}
        />
      ) : (
        <CheckoutNotice
          title="Choose a session"
          message="Select a service and an available time first."
        >
          <ChooseAnotherTime mentorId={mentorId} />
        </CheckoutNotice>
      )}
    </DashboardLayout>
  );
}

function StartCheckout({
  mentorId,
  serviceId,
  date,
  time,
}: Omit<StripeCheckoutInput, 'idempotencyKey'> & { mentorId: string }) {
  const [params, setParams] = useSearchParams();
  const idempotencyKey = params.get('checkoutKey');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!idempotencyKey) {
      // Put the key in the URL before sending the request so reloads can replay it.
      const next = new URLSearchParams({
        service: serviceId,
        date,
        time,
        checkoutKey: crypto.randomUUID(),
      });
      setParams(next, { replace: true });
      return;
    }

    let active = true;
    void createStripeCheckout({ serviceId, date, time, idempotencyKey })
      .then(({ booking }) => {
        if (!active) return;
        const search = new URLSearchParams({ bookingId: booking.id });
        void navigate({ search: search.toString() }, { replace: true });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });

    return () => {
      active = false;
    };
  }, [idempotencyKey, serviceId, date, time, reload, setParams, navigate]);

  if (error) {
    const unavailable = slotOrServiceUnavailable(error);
    return (
      <CheckoutNotice
        title="Checkout could not start"
        message={unavailable ?? 'Check your connection and try again.'}
        error
      >
        {unavailable ? (
          <ChooseAnotherTime mentorId={mentorId} />
        ) : (
          <Button
            variant="blue"
            onClick={() => {
              setError(null);
              setReload((count) => count + 1);
            }}
          >
            Try again
          </Button>
        )}
      </CheckoutNotice>
    );
  }

  return <CheckoutNotice title="Opening checkout" message="Checking your reservation…" />;
}

function CheckoutAttempt({ bookingId }: { bookingId: string }) {
  const [checkout, setCheckout] = useState<StripeCheckout | null>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [retryError, setRetryError] = useState<unknown>(null);
  const [refresh, setRefresh] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const retryInFlight = useRef(false);

  function checkAgain() {
    setReadError(null);
    setRefresh((count) => count + 1);
  }

  useEffect(() => {
    if (retrying) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function verify() {
      try {
        const current = await getStripeCheckout(bookingId);
        if (!active) return;
        setCheckout(current);
        setReadError(null);
        if (current.booking.payment_status === 'pending') {
          timer = setTimeout(() => void verify(), current.clientSecret ? 5000 : 1500);
        }
      } catch (cause) {
        if (!active) return;
        setReadError(cause);
        if (!(cause instanceof ApiError) || cause.status >= 500) {
          timer = setTimeout(() => void verify(), 5000);
        }
      }
    }

    void verify();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [bookingId, refresh, retrying]);

  async function retry(attemptId: string) {
    if (retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    setRetryError(null);
    try {
      setCheckout(await retryStripeCheckout(bookingId, attemptId));
    } catch (cause) {
      setRetryError(cause);
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
      checkAgain();
    }
  }

  if (readError) {
    const unavailable = readError instanceof ApiError && [401, 403, 404].includes(readError.status);
    return (
      <CheckoutNotice
        title={unavailable ? 'Checkout unavailable' : 'Could not check payment'}
        message={
          unavailable
            ? 'This checkout could not be opened.'
            : 'Check your connection. Your payment status will update when we can verify it.'
        }
        error
      >
        {unavailable ? (
          <Link className="text-secondary" to="/dashboard/mentors">
            Find a mentor
          </Link>
        ) : (
          <Button variant="blue" onClick={checkAgain}>
            Check payment status
          </Button>
        )}
      </CheckoutNotice>
    );
  }

  if (!checkout)
    return <CheckoutNotice title="Opening checkout" message="Checking your reservation…" />;

  const { booking, attemptId, clientSecret } = checkout;
  if (booking.status === 'confirmed' && booking.payment_status === 'succeeded') {
    return <Navigate replace to={bookingConfirmationPath(booking.mentor_id, booking.id)} />;
  }

  const expired = booking.payment_status === 'expired';
  if (expired || booking.payment_status === 'failed') {
    const unavailable = slotOrServiceUnavailable(retryError);
    return (
      <CheckoutNotice
        title={expired ? 'Reservation expired' : 'Payment failed'}
        message={
          expired
            ? 'Your reservation expired before payment completed.'
            : 'Stripe could not complete this payment.'
        }
      >
        {retryError instanceof Error && (
          <p role="alert" className="text-danger">
            {unavailable ?? 'Could not start the retry. Check your connection and try again.'}
          </p>
        )}
        {unavailable ? (
          <ChooseAnotherTime mentorId={booking.mentor_id} />
        ) : (
          <Button variant="blue" disabled={retrying} onClick={() => void retry(attemptId)}>
            {retrying ? 'Checking availability…' : 'Retry payment'}
          </Button>
        )}
      </CheckoutNotice>
    );
  }

  if (booking.payment_status === 'pending' && booking.status === 'pending_payment') {
    if (!clientSecret) {
      return (
        <CheckoutNotice title="Payment pending" message="Verifying your payment with Stripe…" />
      );
    }
    return (
      <CheckoutPayment
        key={attemptId}
        booking={booking}
        clientSecret={clientSecret}
        onCheckStatus={checkAgain}
      />
    );
  }

  return (
    <CheckoutNotice
      title="Checkout closed"
      message="View your sessions to see this booking’s status."
    >
      <Link className="text-secondary" to="/dashboard">
        My sessions
      </Link>
    </CheckoutNotice>
  );
}

function slotOrServiceUnavailable(cause: unknown) {
  if (!(cause instanceof ApiError)) return null;
  if (cause.code === 'slot_unavailable') return 'That time is no longer available.';
  if (cause.code === 'service_not_found') return 'The selected service is no longer available.';
  return null;
}

function ChooseAnotherTime({ mentorId }: { mentorId: string }) {
  return (
    <Link to={`/mentors/${mentorId}`} className={buttonVariants({ variant: 'blue' })}>
      Choose another time
    </Link>
  );
}
