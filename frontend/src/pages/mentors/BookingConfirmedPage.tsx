import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Avatar, Button, Textarea, buttonVariants } from '@/components/ui';
import { NavBar } from '@/components/layout/NavBar';
import { getMentorById } from '@/api/mentors';
import type { Mentor, MentorService } from '@/api/mentors';
import {
  bookingRef,
  buildCalendarInvite,
  downloadTextFile,
  formatEuro,
  formatTicketDate,
  readSelection,
  sessionRange,
  sessionTotal,
} from '@/lib/booking';

/**
 * `/mentors/:mentorId/booked`: payment succeeded and the session is
 * on the student's dashboard.
 */
export default function BookingConfirmedPage() {
  const { mentorId } = useParams();
  const [searchParams] = useSearchParams();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [selection, setSelection] = useState<{
    service: MentorService;
    date: string;
    time: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteSent, setNoteSent] = useState(false);

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

  if (!ready) return <div className="min-h-screen bg-canvas" />;

  if (!mentor || !selection) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        <NavBar variant="student" />
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-6 py-20">
          <p className="font-display text-3xl font-bold tracking-tight text-ink">
            No booking to show
          </p>
          <Link to="/mentors" className="font-sans text-sm font-medium text-secondary">
            Find a mentor
          </Link>
        </div>
      </div>
    );
  }

  const total = sessionTotal(selection.service.price);
  const ref = bookingRef(mentor.id, selection.date, selection.time);
  const first = mentor.name.split(' ')[0] ?? mentor.name;
  const when = formatTicketDate(selection.date);
  const range = sessionRange(selection.time, selection.service.duration);

  function downloadReceipt() {
    downloadTextFile(
      `${ref}.txt`,
      [
        'FEUP Connect — receipt',
        `Booking ref ${ref}`,
        `${selection!.service.title} with ${mentor!.name}`,
        `${when} · ${range}`,
        'Format: Google Meet',
        `Amount paid: ${formatEuro(total)}`,
        'Visa •••• 4242',
        'Prototype receipt. No payment was captured.',
      ].join('\n'),
      'text/plain',
    );
  }

  function addToCalendar() {
    downloadTextFile(
      `${ref}.ics`,
      buildCalendarInvite({
        title: `${selection!.service.title} with ${mentor!.name}`,
        date: selection!.date,
        start: selection!.time,
        duration: selection!.service.duration,
        description: `Booking ref ${ref}. Google Meet link arrives by email.`,
      }),
      'text/calendar',
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-canvas">
      <NavBar variant="student" />
      <div className="flex w-full max-w-180 flex-col items-center gap-7 px-6 pb-24 pt-16">
        <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-10" />
        </span>
        <h1 className="text-center font-display text-5xl font-bold tracking-tight text-ink">
          You&rsquo;re booked!
        </h1>
        <p className="max-w-xl text-center font-sans text-lg text-ink-soft">
          Payment confirmed. Your receipt and calendar invite are on their way to
          ana.oliveira@fe.up.pt.
        </p>

        <article className="w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-[0px_16px_40px_0px_rgba(13,43,36,0.1)]">
          <div className="flex items-center gap-4 bg-primary p-7">
            <Avatar initials={mentor.initials} tone="accent" size="md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-display text-[22px] font-semibold tracking-tight text-ink-inverse">
                {selection.service.title} with {mentor.name}
              </p>
              <p className="font-sans text-sm text-primary-soft">
                {mentor.headline.split('·')[0]?.trim()}
              </p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1.5 font-sans text-xs font-medium text-primary">
              PAID
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-7 sm:grid-cols-4">
            <TicketField label="Date" value={when} />
            <TicketField label="Time" value={range} />
            <TicketField label="Format" value="Google Meet" />
            <TicketField label="Amount paid" value={formatEuro(total)} />
          </div>
          <div className="h-px bg-line" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-4">
            <p className="inline-flex items-center gap-2 font-sans text-xs font-medium text-ink-muted">
              <ShieldCheck className="size-4" />
              Booking ref {ref} · Visa •••• 4242
            </p>
            <button
              type="button"
              onClick={downloadReceipt}
              className="font-sans text-sm font-medium text-secondary"
            >
              Download receipt
            </button>
          </div>
        </article>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          <Button
            type="button"
            variant="blue"
            fullWidth
            onClick={() => setNoteOpen(true)}
            icon={<ArrowRight className="size-4" />}
          >
            Message {first}
          </Button>
          <Button type="button" variant="outlined" fullWidth onClick={addToCalendar}>
            Add to calendar
          </Button>
          <Link
            to="/dashboard"
            className={buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })}
          >
            My sessions
          </Link>
        </div>

        {noteOpen && (
          <form
            className="flex w-full flex-col gap-3 rounded-[20px] border border-line bg-surface p-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!note.trim()) return;
              setNoteSent(true);
            }}
          >
            {noteSent ? (
              <p className="font-sans text-sm text-ink">
                Sent to {first}. Chat stays open on your dashboard.
              </p>
            ) : (
              <>
                <Textarea
                  label={`Note for ${first}`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What do you want to cover in this session?"
                  rows={4}
                />
                <Button type="submit" variant="primary">
                  Send note
                </Button>
              </>
            )}
          </form>
        )}

        <section className="flex w-full flex-col gap-3.5 rounded-[20px] bg-accent-soft p-7">
          <p className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink">
            <Sparkles className="size-5 text-accent-strong" />
            Get the most out of your session
          </p>
          {[
            `Send ${first} a quick note with your goals (chat is now unlocked)`,
            'Share your CV or GitHub link before the session',
            'Join the Meet link 2 minutes early to test audio',
          ].map((item) => (
            <p key={item} className="inline-flex items-start gap-2.5 font-sans text-sm text-ink">
              <Check className="mt-0.5 size-4 shrink-0" />
              {item}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-xs font-medium text-ink-muted">{label}</p>
      <p className="font-sans text-base font-semibold text-ink">{value}</p>
    </div>
  );
}
