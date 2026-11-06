import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavBar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Clock,
  GraduationCap,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react';
import { Avatar, buttonVariants } from '@/components/ui';
import { BookingPanel } from '@/components/mentors/BookingPanel';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { getMentorById } from '@/api/mentors';
import { useAuth } from '@/auth/useAuth';
import type { Mentor } from '@/api/mentors';
import { firstName, readSelection, selectionSearch } from '@/lib/booking';
import clsx from 'clsx';

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'posts', label: 'Free posts' },
  { id: 'reviews', label: 'Reviews' },
] as const;

/**
 * `/mentors/:mentorId`: profile, service choice, and the slot the
 * student wants before checkout.
 */
export default function MentorProfilePage() {
  const { mentorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [missing, setMissing] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof SECTIONS)[number]['id']>('about');

  useEffect(() => {
    if (!mentorId) return;
    let cancelled = false;
    getMentorById(mentorId).then((data) => {
      if (cancelled) return;
      if (!data) {
        setMissing(true);
        return;
      }
      const firstSlot = data.availability[0];
      const restored = readSelection(searchParams.toString(), data);
      setMentor(data);
      setServiceId(restored?.service.id ?? data.services[0]?.id ?? '');
      setDate(restored?.date ?? firstSlot?.date ?? '');
      setTime(
        restored?.time ??
          (firstSlot?.times.includes('14:00') ? '14:00' : (firstSlot?.times[0] ?? '')),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [mentorId, searchParams]);

  useEffect(() => {
    if (!mentor || window.location.hash !== '#book') return;
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [mentor]);

  function selectDate(next: string) {
    if (!mentor) return;
    setDate(next);
    const slot = mentor.availability.find((item) => item.date === next);
    setTime((current) => (slot?.times.includes(current) ? current : (slot?.times[0] ?? '')));
  }

  async function shareProfile() {
    const url = window.location.href.split('#')[0] ?? window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (missing) {
    return (
      <ProfileLayout title="Mentor profile">
        <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16 lg:px-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
            Mentor not found
          </h1>
          <Link
            to={user ? '/dashboard/mentors' : '/mentors'}
            className="font-sans text-sm font-medium text-secondary"
          >
            Back to search
          </Link>
        </div>
      </ProfileLayout>
    );
  }

  if (!mentor) {
    return <ProfileLayout title="Mentor profile">{null}</ProfileLayout>;
  }

  const service = mentor.services.find((item) => item.id === serviceId) ?? mentor.services[0];
  const visiblePosts = showAllPosts ? mentor.posts : mentor.posts.slice(0, 2);
  const subject = mentor.subjects[0] ?? 'Mentoring';
  const isOwner = user?.id === mentor.id;

  function continueToPayment() {
    navigate(
      `/mentors/${mentor!.id}/checkout?${selectionSearch({ serviceId: service!.id, date, time })}`,
    );
  }

  return (
    <ProfileLayout title={mentor.name}>
      <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-center gap-2 font-sans text-sm text-ink-muted">
          <Link
            to={user ? '/dashboard/mentors' : '/mentors'}
            className="inline-flex items-center gap-1.5 font-medium text-ink-soft"
          >
            <ArrowLeft className="size-4" />
            Back to results
          </Link>
          <span>·</span>
          <Link to={user ? '/dashboard/mentors' : '/mentors'} className="hover:text-ink">
            Find a mentor
          </Link>
          <span>·</span>
          <span>{subject}</span>
          <span>·</span>
          <span className="text-ink">{mentor.name}</span>
        </div>

        {isOwner && (
          <p className="rounded-xl bg-accent-soft p-4 font-sans text-sm text-accent-strong">
            This is how students see your profile. You can&rsquo;t book your own sessions.{' '}
            <Link to="/dashboard/profile" className="underline">
              Edit profile
            </Link>
          </p>
        )}

        <section className="flex flex-col gap-5 rounded-3xl bg-primary p-7 text-ink-inverse lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row">
            <Avatar
              initials={mentor.initials}
              tone="accent"
              className="size-18! rounded-[36px]! text-[26px]!"
            />
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-4xl font-bold tracking-tight">{mentor.name}</h1>
                {mentor.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-sans text-xs font-medium text-primary">
                    <ShieldCheck className="size-3.5" />
                    Verified mentor
                  </span>
                )}
              </div>
              <p className="font-sans text-base text-primary-soft">{mentor.headline}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm text-primary-soft">
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-accent text-accent" />
                  <span className="font-semibold text-ink-inverse">{mentor.rating}</span>
                  <span>· {mentor.reviewCount} reviews</span>
                </span>
                <span>{mentor.sessionCount} sessions</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {mentor.location} · {mentor.languages}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {mentor.replyTime}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mentor.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-white/10 px-2.5 py-1 font-sans text-xs font-medium text-primary-soft"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSaved((current) => !current)}
                className={buttonVariants({ variant: 'inverted', size: 'md' })}
              >
                <Bookmark className={clsx('size-4', saved && 'fill-primary')} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <button
                type="button"
                onClick={shareProfile}
                className={buttonVariants({ variant: 'inverted', size: 'md' })}
              >
                <Share2 className="size-4" />
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>
            <p className="inline-flex items-center gap-1.5 font-sans text-xs text-primary-soft">
              <MessageCircle className="size-3.5" />
              Chat unlocks after you book
            </p>
          </div>
        </section>

        <div className="flex flex-col items-start gap-8 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex gap-6 border-b border-line">
              {SECTIONS.map((section) => {
                const count =
                  section.id === 'services'
                    ? mentor.services.length
                    : section.id === 'posts'
                      ? mentor.posts.length
                      : section.id === 'reviews'
                        ? mentor.reviewCount
                        : null;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      document
                        .getElementById(section.id)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={clsx(
                      'border-b-2 pb-3 font-sans text-sm font-medium',
                      activeSection === section.id
                        ? 'border-primary text-ink'
                        : 'border-transparent text-ink-muted',
                    )}
                  >
                    {section.label}
                    {count !== null ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>

            <section
              id="about"
              className="flex scroll-mt-6 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
            >
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                About {firstName(mentor.name)}
              </h2>
              <p className="whitespace-pre-wrap font-sans text-base leading-relaxed text-ink-soft">
                {mentor.about}
              </p>
              {mentor.professionalBackground && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    Professional background
                  </h3>
                  <p className="whitespace-pre-wrap font-sans text-base text-ink-soft">
                    {mentor.professionalBackground}
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-sans text-sm font-semibold text-ink">Subject areas</h3>
                <ul className="flex flex-wrap gap-3">
                  {mentor.subjects.map((subject) => (
                    <li key={subject}>{subject}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                {mentor.experience.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-subtle text-ink-soft">
                      {item.kind === 'study' ? (
                        <GraduationCap className="size-4.5" />
                      ) : (
                        <Briefcase className="size-4.5" />
                      )}
                    </span>
                    <div className="flex flex-col">
                      <p className="font-sans text-sm font-semibold text-ink">{item.title}</p>
                      <p className="font-sans text-sm text-ink-muted">{item.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="services"
              className="flex scroll-mt-6 flex-col gap-4 rounded-[20px] border border-line bg-surface p-7"
            >
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Choose a session
                </h2>
                <p className="font-sans text-sm text-ink-soft">
                  Each session is paid up front. You’ll get a Google Meet link and chat access once
                  payment is confirmed.
                </p>
              </div>
              {!service && <p>No sessions are currently available.</p>}
              {mentor.services.map((item) => {
                const selected = item.id === service?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setServiceId(item.id)}
                    className={clsx(
                      'flex w-full items-start gap-4 rounded-2xl border p-5 text-left',
                      selected ? 'border-primary bg-primary-soft' : 'border-line bg-canvas',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary' : 'border-ink-muted bg-surface',
                      )}
                    >
                      {selected && <span className="size-2 rounded-full bg-ink-inverse" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-sans text-base font-semibold text-ink">
                        {item.title}
                      </span>
                      <span className="font-sans text-sm text-ink-soft">{item.description}</span>
                      <span className="mt-1 flex items-center gap-3 font-sans text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {item.duration}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Video className="size-3.5" />
                          Google Meet
                        </span>
                      </span>
                    </span>
                    <span className="font-display text-xl font-bold tracking-tight text-ink">
                      €{item.price}
                    </span>
                  </button>
                );
              })}
            </section>

            <section
              id="posts"
              className="flex scroll-mt-6 flex-col gap-4 rounded-[20px] border border-line bg-surface p-7"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Free posts from {firstName(mentor.name)}
                </h2>
                {mentor.posts.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPosts((current) => !current)}
                    className="font-sans text-sm font-medium text-secondary"
                  >
                    {showAllPosts ? 'Show less' : `View all ${mentor.posts.length}`}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {visiblePosts.map((post) => (
                  <article key={post.id} className="flex flex-col gap-2 rounded-2xl bg-canvas p-5">
                    <p className="font-sans text-xs font-semibold text-secondary">
                      {post.category}
                    </p>
                    <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                      {post.title}
                    </h3>
                    <p className="font-sans text-sm text-ink-soft">{post.excerpt}</p>
                    <p className="font-sans text-xs text-ink-muted">
                      {post.readTime} · {post.published}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="reviews"
              className="flex scroll-mt-6 flex-col gap-5 rounded-[20px] border border-line bg-surface p-7"
            >
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl font-bold tracking-tight text-ink">
                  {mentor.rating.toFixed(1)}
                </p>
                <div className="flex flex-col gap-1 pb-1">
                  <span className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={clsx(
                          'size-4',
                          mentor.rating >= index + 1
                            ? 'fill-accent text-accent'
                            : 'fill-accent/40 text-accent',
                        )}
                      />
                    ))}
                  </span>
                  <p className="font-sans text-sm text-ink-muted">
                    Based on {mentor.reviewCount} reviews from completed sessions
                  </p>
                </div>
              </div>
              {mentor.reviews.map((review) => (
                <div key={review.id} className="flex flex-col gap-2 border-t border-line pt-5">
                  <div className="flex items-center gap-3">
                    <Avatar initials={review.authorInitials} tone="tertiary" size="sm" />
                    <div className="flex flex-1 flex-col">
                      <p className="font-sans text-sm font-semibold text-ink">
                        {review.authorName}
                      </p>
                      <span className="flex gap-0.5">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            className={clsx(
                              'size-3.5',
                              review.rating >= index + 1 ? 'fill-accent text-accent' : 'text-line',
                            )}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-ink-muted">{review.date}</p>
                  </div>
                  <p className="font-sans text-sm text-ink-soft">{review.comment}</p>
                </div>
              ))}
            </section>
          </div>

          {!isOwner && service && (
            <BookingPanel
              mentor={mentor}
              service={service}
              date={date}
              time={time}
              onDateChange={selectDate}
              onTimeChange={setTime}
              onContinue={continueToPayment}
            />
          )}
        </div>
      </div>
    </ProfileLayout>
  );
}

function ProfileLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading profile…</p>;
  if (user) return <DashboardLayout title={title}>{children}</DashboardLayout>;
  return (
    <>
      <NavBar className="max-sm:h-auto max-sm:flex-wrap max-sm:gap-4 max-sm:py-4" />
      <main className="mx-auto max-w-7xl">{children}</main>
      <Footer />
    </>
  );
}
