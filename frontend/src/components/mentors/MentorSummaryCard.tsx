import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, Tag, buttonVariants } from '@/components/ui';
import type { AvatarTone } from '@/components/ui';
import type { TagTone } from '@/components/ui';

export interface MentorSummary {
  id: string;
  initials: string;
  avatarTone: AvatarTone;
  name: string;
  role: string;
  tag: string;
  tagTone: TagTone;
  rating: string;
  price: string;
}

/**
 * Compact mentor card (avatar, name, role, one tag, rating and
 * price) used in the landing page's featured grid and the student
 * onboarding recommendations.
 */
export function MentorSummaryCard({ mentor }: { mentor: MentorSummary }) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-[20px] border border-line bg-surface p-6">
      <div className="flex items-center gap-3.5">
        <Avatar initials={mentor.initials} tone={mentor.avatarTone} size="md" />
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            {mentor.name}
          </p>
          <p className="font-sans text-sm text-ink-muted">{mentor.role}</p>
        </div>
      </div>

      <Tag label={mentor.tag} tone={mentor.tagTone} />

      <div className="h-px w-full bg-line" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Star className="size-4 fill-accent text-accent" />
          <p className="font-sans text-sm font-medium text-ink">{mentor.rating}</p>
        </div>
        <p className="flex items-baseline gap-1">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            {mentor.price}
          </span>
          <span className="font-sans text-xs font-medium text-ink-muted">/ session</span>
        </p>
      </div>

      <Link
        to={`/mentors/${mentor.id}`}
        className={buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true })}
      >
        View profile
      </Link>
    </div>
  );
}
