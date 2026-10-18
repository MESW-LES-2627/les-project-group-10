import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { Avatar, Tag, buttonVariants } from '@/components/ui';
// import { OnboardingTopBar } from '@/layouts/OnboardingTopBar';
import { useMentorOnboarding } from './useMentorOnboarding';
import { getInitials, lowestServicePrice, pluralize, tagsFromSkills } from '@/lib/mentorProfile';

const WHILE_YOU_WAIT = [
  'Write your first free post to boost visibility',
  'Double-check your weekly availability',
  'Share your profile link with students who already know you',
];

/**
 * Shown right after a mentor submits onboarding: confirms the
 * profile is under review and previews what students will see.
 */
export default function MentorPendingVerificationPage() {
  const { data } = useMentorOnboarding();

  const firstName = data.fullName.trim().split(/\s+/)[0] ?? '';
  const tags = tagsFromSkills(data.skills);
  const fromPrice = lowestServicePrice(data.services);

  return (
    <div className="flex w-full flex-col items-center bg-canvas">
      {/* <OnboardingTopBar label="Mentor profile · Under review" exitLabel="Exit" /> */}

      <div className="flex w-full max-w-170 flex-col items-center gap-7 px-6 pb-24 pt-16">
        <span className="flex size-20 items-center justify-center rounded-full bg-accent-soft">
          <Clock className="size-10 text-accent-strong" />
        </span>

        <p className="text-center font-display text-5xl font-bold leading-tight tracking-tight text-ink">
          {firstName ? `Thanks, ${firstName}! ` : ''}Your profile is in review.
        </p>
        <p className="text-center font-sans text-lg leading-relaxed text-ink-soft">
          We verify every new mentor to keep FEUP Connect trustworthy for students, usually within
          24 hours. We&rsquo;ll email you the moment you&rsquo;re live.
        </p>

        <div className="flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0px_16px_40px_0px_rgba(13,43,36,0.1)]">
          <div className="flex w-full items-center gap-4.5 bg-primary p-7">
            <Avatar initials={getInitials(data.fullName) || '—'} tone="accent" size="md" />
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-display text-xl font-semibold tracking-tight text-ink-inverse">
                {data.fullName || 'Your name'}
              </p>
              <p className="font-sans text-sm text-primary-soft">
                {data.headline || 'Your professional headline'}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-3 py-1.5">
              <Clock className="size-3.5 text-primary" />
              <span className="font-sans text-xs font-medium text-primary">
                Pending verification
              </span>
            </span>
          </div>

          <div className="flex w-full flex-wrap gap-4 p-7">
            <div className="flex min-w-30 flex-1 flex-col gap-1">
              <p className="font-sans text-xs font-medium text-ink-muted">Subjects</p>
              <p className="font-sans text-base font-semibold text-ink">
                {pluralize(data.subjects.length, 'area')}
              </p>
            </div>
            <div className="flex min-w-30 flex-1 flex-col gap-1">
              <p className="font-sans text-xs font-medium text-ink-muted">Services</p>
              <p className="font-sans text-base font-semibold text-ink">
                {data.services.length} offered
              </p>
            </div>
            <div className="flex min-w-30 flex-1 flex-col gap-1">
              <p className="font-sans text-xs font-medium text-ink-muted">From</p>
              <p className="font-sans text-base font-semibold text-ink">
                {fromPrice ? `${fromPrice} / session` : '—'}
              </p>
            </div>
            <div className="flex min-w-30 flex-1 flex-col gap-1">
              <p className="font-sans text-xs font-medium text-ink-muted">Availability</p>
              <p className="font-sans text-base font-semibold text-ink">
                {pluralize(data.availableSlotKeys.length, 'slot')} / week
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-7 pb-2">
            {tags.map((tag) => (
              <Tag key={tag.label} label={tag.label} tone={tag.tone} />
            ))}
          </div>

          <div className="h-px w-full bg-line" />

          <div className="flex w-full flex-wrap items-center justify-between gap-2 px-7 py-4.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-ink-muted" />
              <p className="font-sans text-xs font-medium text-ink-muted">
                Visible to students only after verification
              </p>
            </div>
            <Link
              to="/mentor-onboarding/profile"
              className="font-sans text-sm font-medium text-secondary"
            >
              Edit profile
            </Link>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            to="/mentors"
            className={buttonVariants({
              variant: 'outlined',
              fullWidth: true,
              className: 'sm:flex-1',
            })}
          >
            Preview my public profile
          </Link>
          <Link
            to="/"
            className={buttonVariants({ variant: 'blue', fullWidth: true, className: 'sm:flex-1' })}
          >
            Go to dashboard
            <ArrowRight className="size-5" />
          </Link>
        </div>

        <div className="flex w-full flex-col gap-3.5 rounded-2xl bg-secondary-soft p-7">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-5 text-secondary" />
            <p className="font-display text-lg font-semibold tracking-tight text-ink">
              While you wait
            </p>
          </div>
          {WHILE_YOU_WAIT.map((tip) => (
            <div key={tip} className="flex items-center gap-2.5">
              <Check className="size-4 shrink-0 text-secondary" />
              <p className="font-sans text-sm text-ink">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
