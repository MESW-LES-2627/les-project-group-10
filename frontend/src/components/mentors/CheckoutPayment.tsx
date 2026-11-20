import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { Avatar, Button, InfoNote } from '@/components/ui';
import { getStripeConfig } from '@/api/bookings';
import type { BookingRecord } from '@/api/bookings';
import {
  bookingConfirmationPath,
  formatEuro,
  formatLongDate,
  formatShortDate,
  lisbonBookingTime,
  sessionRange,
} from '@/lib/booking';
import { useAuth } from '@/auth/useAuth';

export function CheckoutPayment({
  booking,
  clientSecret,
  onCheckStatus,
}: {
  booking: BookingRecord;
  clientSecret: string;
  onCheckStatus: () => void;
}) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [configError, setConfigError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    void getStripeConfig()
      .then(({ publishableKey }) => {
        if (!active) return;
        const stripe = loadStripe(publishableKey, {
          developerTools: { assistant: { enabled: false } },
        });
        setStripePromise(stripe);
        return stripe.then((instance) => {
          if (!instance && active) setConfigError(true);
        });
      })
      .catch(() => {
        if (active) setConfigError(true);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  if (configError) {
    return (
      <CheckoutNotice
        title="Payment form unavailable"
        message="The payment form could not load."
        error
      >
        <Button
          variant="blue"
          onClick={() => {
            setConfigError(false);
            setStripePromise(null);
            setReload((count) => count + 1);
          }}
        >
          Try loading again
        </Button>
      </CheckoutNotice>
    );
  }

  if (!stripePromise)
    return <CheckoutNotice title="Opening checkout" message="Loading payment details…" />;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#0f766e', borderRadius: '10px' },
        },
      }}
    >
      <CheckoutForm booking={booking} onCheckStatus={onCheckStatus} />
    </Elements>
  );
}

function CheckoutForm({
  booking,
  onCheckStatus,
}: {
  booking: BookingRecord;
  onCheckStatus: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.username ?? '';
  const userEmail = user?.email ?? '';
  const [submitting, setSubmitting] = useState(false);
  const submissionInFlight = useRef(false);
  const [error, setError] = useState('');
  const { date, time } = lisbonBookingTime(booking.scheduled_at);
  const duration = `${booking.duration_minutes} min`;
  const total = booking.amount_cents / 100;
  const initials = booking.mentor_name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const bookedPath = bookingConfirmationPath(booking.mentor_id, booking.id);

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: new URL(bookedPath, window.location.origin).href,
          payment_method_data: { billing_details: { name: userName, email: userEmail } },
        },
        redirect: 'if_required',
      });
      if (result.error) {
        setError(result.error.message ?? 'Payment could not be completed.');
        onCheckStatus();
        return;
      }
      void navigate(bookedPath, { replace: true });
    } catch {
      setError('Could not reach Stripe. Checking the saved payment status now.');
      onCheckStatus();
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex flex-wrap items-center gap-3 font-sans text-sm font-medium">
          <li className="inline-flex items-center gap-2 text-ink">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-ink-inverse">
              <ShieldCheck className="size-3.5" />
            </span>
            Session
          </li>
          <li className="text-ink-muted">›</li>
          <li className="inline-flex items-center gap-2 text-ink">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary font-sans text-xs text-ink-inverse">
              2
            </span>
            Payment
          </li>
          <li className="text-ink-muted">›</li>
          <li className="inline-flex items-center gap-2 text-ink-muted">
            <span className="flex size-6 items-center justify-center rounded-full bg-subtle font-sans text-xs text-ink-muted">
              3
            </span>
            Confirmed
          </li>
        </ol>
        <p className="inline-flex items-center gap-2 font-sans text-sm font-medium text-primary">
          <Lock className="size-4" />
          Secure checkout
        </p>
      </div>
      <form onSubmit={handlePay} className="flex w-full flex-col gap-8 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Link
            to={`/mentors/${booking.mentor_id}`}
            className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-ink-soft"
          >
            <ArrowLeft className="size-4" />
            Back to {booking.mentor_name.split(' ')[0]}&rsquo;s profile
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
              Pay for your session
            </h1>
            <p className="font-sans text-lg text-ink-soft">
              You&rsquo;re booking a {booking.service_title} with {booking.mentor_name} on{' '}
              {formatShortDate(date)}.
            </p>
          </div>
          <InfoNote icon={<Sparkles className="size-5" />} tone="accent">
            <span className="font-semibold">Stripe test mode.</span> This checkout uses Stripe test
            credentials and does not move real money.
          </InfoNote>
          <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-7">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Payment details
            </h2>
            <p className="font-sans text-sm text-ink-soft">Paying as {userEmail}</p>
            <PaymentElement
              options={{
                layout: 'tabs',
                wallets: { applePay: 'auto', googlePay: 'auto', link: 'never' },
                defaultValues: { billingDetails: { name: userName, email: userEmail } },
                fields: { billingDetails: { name: 'never', email: 'never' } },
              }}
            />
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-4 py-3 font-sans text-sm text-danger"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="blue"
            fullWidth
            disabled={!stripe || submitting}
            icon={<ArrowRight className="size-5" />}
          >
            {submitting ? 'Processing payment…' : `Pay ${formatEuro(total)} and confirm booking`}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center font-sans text-xs text-ink-muted">
            <Lock className="size-3.5" />
            Payment is processed in Stripe test mode.
          </p>
        </div>
        <aside className="flex h-fit w-full shrink-0 flex-col gap-4 rounded-[20px] border border-line bg-surface p-7 lg:w-95">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Order summary
          </h2>
          <div className="flex items-center gap-3">
            <Avatar initials={initials} tone="accent" size="md" />
            <div className="flex flex-col">
              <p className="font-sans text-base font-semibold text-ink">{booking.mentor_name}</p>
              <p className="font-sans text-sm text-ink-muted">
                {booking.mentor_headline.split('·')[0]?.trim()}
              </p>
            </div>
          </div>
          <div className="h-px bg-line" />
          <SummaryRow icon={<GraduationCap className="size-4" />} title={booking.service_title} />
          <SummaryRow icon={<Calendar className="size-4" />} title={formatLongDate(date)} />
          <SummaryRow
            icon={<Clock className="size-4" />}
            title={sessionRange(time, duration)}
            detail={`Lisbon time · ${duration}`}
          />
          <SummaryRow
            icon={<Video className="size-4" />}
            title="Google Meet"
            detail="Meeting link is not yet provisioned"
          />
          <div className="h-px bg-line" />
          <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
            <span>Session fee</span>
            <span>{formatEuro(booking.service_price_cents / 100)}</span>
          </div>
          <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
            <span>Platform fee</span>
            <span>{formatEuro((booking.amount_cents - booking.service_price_cents) / 100)}</span>
          </div>
          <div className="flex items-center justify-between font-sans text-base font-semibold text-ink">
            <span>Total</span>
            <span className="font-display text-2xl font-bold tracking-tight">
              {formatEuro(total)}
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SummaryRow({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-soft">
        {icon}
      </span>
      <div className="flex flex-col">
        <p className="font-sans text-sm font-semibold text-ink">{title}</p>
        {detail && <p className="font-sans text-xs text-ink-muted">{detail}</p>}
      </div>
    </div>
  );
}

export function CheckoutNotice({
  title,
  message,
  children,
  error,
}: {
  title: string;
  message: string;
  children?: ReactNode;
  error?: boolean;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p role={error ? 'alert' : 'status'} className="font-sans text-ink-soft">
        {message}
      </p>
      {children}
    </section>
  );
}
