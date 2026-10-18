import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  CreditCard,
  Globe,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import { Button, Checkbox, InfoNote, Input, Logo, SelectField } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { getMentorById } from '@/api/mentors';
import { useAuth } from '@/auth/useAuth';
import type { Mentor, MentorService } from '@/api/mentors';
import {
  PLATFORM_FEE,
  bookingRef,
  formatEuro,
  formatLongDate,
  formatShortDate,
  readSelection,
  saveStudentBooking,
  sessionRange,
  sessionTotal,
} from '@/lib/booking';
import clsx from 'clsx';

type PaymentMethod = 'card' | 'mbway' | 'apple';

/**
 * `/mentors/:mentorId/checkout`: prototype payment for the session
 * chosen on the mentor profile.
 */
export default function CheckoutPage() {
  const { mentorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [selection, setSelection] = useState<{
    service: MentorService;
    date: string;
    time: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 28');
  const [cvc, setCvc] = useState('123');
  const [nameOnCard, setNameOnCard] = useState(user?.username ?? '');
  const [country, setCountry] = useState('Portugal');
  const [saveCard, setSaveCard] = useState(true);

  useEffect(() => {
    if (!mentorId) return;
    let cancelled = false;
    getMentorById(mentorId).then((data) => {
      if (cancelled) return;
      setMentor(data);
      setSelection(data ? readSelection(searchParams.toString(), data) : null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mentorId, searchParams]);

  if (!ready) {
    return <div className="min-h-screen bg-canvas" />;
  }

  if (!mentor || !selection) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-canvas px-6 py-20">
        <p className="font-display text-3xl font-bold tracking-tight text-ink">
          Choose a session first
        </p>
        <Link
          to={mentor ? `/mentors/${mentor.id}` : '/mentors'}
          className="mt-4 font-sans text-sm font-medium text-secondary"
        >
          Back to the mentor
        </Link>
      </div>
    );
  }

  const total = sessionTotal(selection.service.price);
  const query = searchParams.toString();

  function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mentor || !selection) return;
    const ref = bookingRef(mentor.id, selection.date, selection.time);
    saveStudentBooking({
      id: ref,
      mentorId: mentor.id,
      serviceId: selection.service.id,
      date: selection.date,
      time: selection.time,
      total,
      ref,
    });
    navigate(`/mentors/${mentor.id}/booked?${query}`);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="flex h-22 w-full items-center justify-between border-b border-line px-6 lg:px-30">
        <Logo />
        <ol className="hidden items-center gap-3 font-sans text-sm font-medium sm:flex">
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
      </header>

      <form
        onSubmit={handlePay}
        className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10"
      >
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
            <span className="font-semibold">Prototype · Stripe test mode.</span> No real money is
            charged. Use card 4242 4242 4242 4242, any future date and any CVC.
          </InfoNote>

          <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-7">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Contact details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                leadingIcon={<User className="size-5" />}
                required
              />
              <Input
                label="Email for receipt"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                leadingIcon={<Mail className="size-5" />}
                required
              />
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-7">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
              Payment method
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <MethodButton
                label="Card"
                icon={<CreditCard className="size-5" />}
                selected={method === 'card'}
                onClick={() => setMethod('card')}
              />
              <MethodButton
                label="MB WAY"
                icon={<Globe className="size-5" />}
                selected={method === 'mbway'}
                onClick={() => setMethod('mbway')}
              />
              <MethodButton
                label="Apple Pay"
                icon={<Lock className="size-5" />}
                selected={method === 'apple'}
                onClick={() => setMethod('apple')}
              />
            </div>

            {method === 'card' && (
              <div className="flex flex-col gap-4">
                <Input
                  label="Card number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  leadingIcon={<CreditCard className="size-5" />}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Expiry date"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                    leadingIcon={<Calendar className="size-5" />}
                    required
                  />
                  <Input
                    label="CVC"
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                    leadingIcon={<Lock className="size-5" />}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Name on card"
                    value={nameOnCard}
                    onChange={(event) => setNameOnCard(event.target.value)}
                    leadingIcon={<User className="size-5" />}
                    required
                  />
                  <SelectField
                    label="Country"
                    leadingIcon={<Globe className="size-5" />}
                    options={['Portugal', 'Spain', 'France', 'Other']}
                    value={country}
                    onChange={setCountry}
                  />
                </div>
                <Checkbox
                  checked={saveCard}
                  onChange={setSaveCard}
                  label="Save this card for future bookings"
                />
              </div>
            )}
            {method === 'mbway' && (
              <p className="font-sans text-sm text-ink-soft">
                You&rsquo;ll confirm this payment in the MB WAY app. No charge is made in this
                prototype.
              </p>
            )}
            {method === 'apple' && (
              <p className="font-sans text-sm text-ink-soft">
                You&rsquo;ll confirm with Apple Pay. No charge is made in this prototype.
              </p>
            )}
          </section>

          <Button type="submit" variant="blue" fullWidth icon={<ArrowRight className="size-5" />}>
            Pay {formatEuro(total)} and confirm booking
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center font-sans text-xs text-ink-muted">
            <Lock className="size-3.5" />
            Payments processed by Stripe. FEUP Connect never stores your card details.
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
            detail={`Lisbon time (WEST) · ${selection.service.duration}`}
          />
          <SummaryRow
            icon={<Video className="size-4" />}
            title="Google Meet"
            detail="Link shared after payment"
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
            <span>Total due today</span>
            <span className="font-display text-2xl font-bold tracking-tight">
              {formatEuro(total)}
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-primary-soft p-4">
            <p className="font-sans text-sm font-semibold text-primary">What happens next</p>
            {[
              'Your payment is verified instantly',
              `Chat with ${mentor.name.split(' ')[0]} unlocks`,
              'Meet link & calendar invite go to your email',
            ].map((item) => (
              <p key={item} className="font-sans text-sm text-ink">
                ✓ {item}
              </p>
            ))}
          </div>
          <p className="font-sans text-xs text-ink-muted">
            Free cancellation up to 24h before the session. After that, the session fee is
            non-refundable.
          </p>
        </aside>
      </form>
    </div>
  );
}

function MethodButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border font-sans text-sm font-medium',
        selected
          ? 'border-primary bg-primary-soft text-ink'
          : 'border-line bg-surface text-ink-soft',
      )}
    >
      {icon}
      {label}
    </button>
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
