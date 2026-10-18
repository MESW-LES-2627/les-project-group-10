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
    <div className="flex w-full gap-6 rounded-2xl border border-line bg-surface p-6">
      <Avatar initials={mentor.initials} tone={mentor.avatarTone} size="lg" />

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <p className="font-display text-xl font-semibold tracking-tight text-ink">
            {mentor.name}
          </p>
          {mentor.verified && <ShieldCheck className="size-4.5 text-secondary" />}
        </div>
        <p className="font-sans text-base text-ink-soft">{mentor.headline}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Star className="size-4 fill-accent text-accent" />
          <p className="font-sans text-sm font-medium text-ink">{mentor.rating}</p>
          <p className="font-sans text-sm text-ink-muted">({mentor.reviewCount} reviews)</p>
          <p className="font-sans text-sm text-ink-muted">·</p>
          <MapPin className="size-4 text-ink-muted" />
          <p className="font-sans text-sm text-ink-muted">
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

      <div className="flex w-50 shrink-0 flex-col gap-3">
        <p className="font-sans text-xs font-medium text-ink-muted">From</p>
        <p className="flex items-baseline gap-1.5">
          <span className="font-display text-[32px] font-bold tracking-tight text-ink">
            €{lowestPrice}
          </span>
          <span className="font-sans text-sm text-ink-muted">/ {primaryDuration}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 text-ink-soft" />
          <p className="font-sans text-sm text-ink-soft">Next: {mentor.nextAvailable}</p>
        </div>
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
  );
}
