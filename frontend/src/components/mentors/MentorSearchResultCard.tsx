import { Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, Tag, buttonVariants } from '@/components/ui';
import type { Mentor } from '@/api/mentors';
import { gatePath } from '@/lib/auth';

/**
 * Large mentor card used in search results: full bio, tags, and a
 * booking column with the lowest price and next available slot.
 */
export function MentorSearchResultCard({ mentor }: { mentor: Mentor }) {
  const lowestPrice = Math.min(...mentor.services.map((service) => service.price));
  const primaryDuration = mentor.services[0]?.duration ?? '';

  return (
    <article className="flex w-full flex-col gap-5 rounded-2xl border border-line bg-surface p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
        <Avatar initials={mentor.initials} tone={mentor.avatarTone} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
              {mentor.name}
            </p>
            {mentor.verified && <ShieldCheck className="size-4.5 shrink-0 text-secondary" />}
          </div>
          <p className="font-sans text-sm text-ink-soft sm:text-base">{mentor.headline}</p>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Star className="size-4 shrink-0 fill-accent text-accent" />
            <p className="font-sans text-sm font-medium text-ink">{mentor.rating}</p>
            <p className="font-sans text-sm text-ink-muted">({mentor.reviewCount} reviews)</p>
            <p className="font-sans text-sm text-ink-muted">·</p>
            <MapPin className="size-4 shrink-0 text-ink-muted" />
            <p className="min-w-0 font-sans text-sm text-ink-muted">
              {mentor.location} · {mentor.languages}
            </p>
          </div>
          <p className="font-sans text-sm text-ink-soft">{mentor.bio}</p>
          <div className="flex flex-wrap gap-2">
            {mentor.tags.map((tag) => (
              <Tag key={tag.label} label={tag.label} tone={tag.tone} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 border-t border-line pt-5 lg:w-50 lg:border-t-0 lg:pt-0">
        <div className="flex flex-wrap items-end justify-between gap-3 lg:flex-col lg:items-start">
          <div>
            <p className="font-sans text-xs font-medium text-ink-muted">From</p>
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-display text-[28px] font-bold tracking-tight text-ink sm:text-[32px]">
                €{lowestPrice}
              </span>
              <span className="font-sans text-sm text-ink-muted">/ {primaryDuration}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 shrink-0 text-ink-soft" />
            <p className="font-sans text-sm text-ink-soft">Next: {mentor.nextAvailable}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-1">
          <Link
            to={gatePath(`/mentors/${mentor.id}#book`)}
            className={buttonVariants({ variant: 'primary', size: 'md', fullWidth: true })}
          >
            Book session
          </Link>
          <Link
            to={gatePath(`/mentors/${mentor.id}`)}
            className={buttonVariants({ variant: 'outlined', size: 'md', fullWidth: true })}
          >
            View profile
          </Link>
        </div>
      </div>
    </article>
  );
}
