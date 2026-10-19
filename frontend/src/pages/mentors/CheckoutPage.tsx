import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
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
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getMentorById } from '@/api/mentors';
import type { Mentor, MentorService } from '@/api/mentors';
import { createStripeCheckout, getStripeConfig } from '@/api/bookings';
import {
  PLATFORM_FEE,
  formatEuro,
  formatLongDate,
  formatShortDate,
  readSelection,
  sessionRange,
  sessionTotal,
} from '@/lib/booking';
import { useAuth } from '@/auth/useAuth';

export default function CheckoutPage() {
  const { mentorId } = useParams();
  const [searchParams] = useSearchParams();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [selection, setSelection] = useState<{
    service: MentorService;
    date: string;
    time: string;
  } | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!mentorId) return;
    let cancelled = false;
    Promise.all([getMentorById(mentorId), getStripeConfig()])
      .then(([data, config]) => {
        if (cancelled) return;
        setMentor(data);
        setSelection(data ? readSelection(searchParams.toString(), data) : null);
        setStripePromise(
          loadStripe(config.publishableKey, {
            developerTools: { assistant: { enabled: false } },
          }),
        );
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Checkout could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [mentorId, searchParams]);

  useEffect(() => {
    if (!mentor || !selection || !user) return;
    let cancelled = false;
    createStripeCheckout({
      serviceId: selection.service.id,
      date: selection.date,
      time: selection.time,
      idempotencyKey,
    })
      .then((result) => {
        if (cancelled) return;
        setBookingId(result.bookingId);
        setClientSecret(result.clientSecret);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : 'Checkout could not be started.');
      });
    return () => {
      cancelled = true;
    };
  }, [mentor, selection, user, idempotencyKey]);

  if (!mentor || !selection) {
    return <DashboardLayout title="Checkout">{null}</DashboardLayout>;
  }
  const total = sessionTotal(selection.service.price);
  const query = searchParams.toString();
  if (error)
    return (
      <DashboardLayout title="Checkout">
        <div
          className="mx-auto max-w-xl px-4 py-16 text-center font-sans text-danger lg:px-8"
          role="alert"
        >
          {error}
        </div>
      </DashboardLayout>
    );
  if (!stripePromise || !clientSecret || !bookingId)
    return <DashboardLayout title="Checkout">{null}</DashboardLayout>;

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: 'stripe', variables: { colorPrimary: '#0f766e', borderRadius: '10px' } },
  };

  return (
    <DashboardLayout title="Checkout">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm
          mentor={mentor}
          selection={selection}
          query={query}
          total={total}
          bookingId={bookingId}
          userName={user?.username ?? ''}
          userEmail={user?.email ?? ''}
        />
      </Elements>
    </DashboardLayout>
  );
}

function CheckoutForm({
  mentor,
  selection,
  query,
  total,
  bookingId,
  userName,
  userEmail,
}: {
  mentor: Mentor;
  selection: { service: MentorService; date: string; time: string };
  query: string;
  total: number;
  bookingId: string;
  userName: string;
  userEmail: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const returnUrl = `${window.location.origin}/mentors/${mentor.id}/booked?bookingId=${encodeURIComponent(bookingId)}`;

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError('');
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: { billing_details: { name: userName, email: userEmail } },
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message ?? 'Payment could not be completed. Please try again.');
      setSubmitting(false);
      return;
    }
    navigate(`/mentors/${mentor.id}/booked?bookingId=${encodeURIComponent(bookingId)}`);
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
            to={`/mentors/${mentor.id}?${query}`}
            className="inline-flex items-center gap-1.5 font-sans text-sm font-medium text-ink-soft"
          >
            <ArrowLeft className="size-4" />
            Back to {mentor.name.split(' ')[0]}&rsquo;s profile
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
              Pay for your session
            </h1>
            <p className="font-sans text-lg text-ink-soft">
              You&rsquo;re booking a {selection.service.title} with {mentor.name} on{' '}
              {formatShortDate(selection.date)}.
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
            <Avatar initials={mentor.initials} tone={mentor.avatarTone} size="md" />
            <div className="flex flex-col">
              <p className="font-sans text-base font-semibold text-ink">{mentor.name}</p>
              <p className="font-sans text-sm text-ink-muted">
                {mentor.headline.split('·')[0]?.trim()}
              </p>
            </div>
          </div>
          <div className="h-px bg-line" />
          <SummaryRow
            icon={<GraduationCap className="size-4" />}
            title={selection.service.title}
            detail={selection.service.description}
          />
          <SummaryRow
            icon={<Calendar className="size-4" />}
            title={formatLongDate(selection.date)}
          />
          <SummaryRow
            icon={<Clock className="size-4" />}
            title={sessionRange(selection.time, selection.service.duration)}
            detail={`Lisbon time · ${selection.service.duration}`}
          />
          <SummaryRow
            icon={<Video className="size-4" />}
            title="Google Meet"
            detail="Meeting link is not yet provisioned"
          />
          <div className="h-px bg-line" />
          <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
            <span>Session fee</span>
            <span>{formatEuro(selection.service.price)}</span>
          </div>
          <div className="flex items-center justify-between font-sans text-sm text-ink-soft">
            <span>Platform fee</span>
            <span>{formatEuro(PLATFORM_FEE)}</span>
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
