import { Star } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { AvatarTone } from '@/components/ui';

export interface PastSessionRowProps {
  initials: string;
  avatarTone: AvatarTone;
  title: string;
  date: string;
  rating?: number;
}

/**
 * One row in the dashboard's "Past sessions" list: either shows the
 * rating already given, or a prompt to rate the session.
 */
export function PastSessionRow({ initials, avatarTone, title, date, rating }: PastSessionRowProps) {
  return (
    <div className="flex w-full items-center gap-4">
      <Avatar initials={initials} tone={avatarTone} size="sm" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-sans text-sm font-medium text-ink">{title}</p>
        <p className="font-sans text-xs text-ink-muted">{date}</p>
      </div>
      {rating ? (
        <div className="flex items-center gap-1">
          <Star className="size-3.5 fill-accent text-accent" />
          <p className="font-sans text-xs font-medium text-ink-soft">
            You rated {rating.toFixed(1)}
          </p>
        </div>
      ) : (
        <button type="button" className="font-sans text-sm font-medium text-secondary">
          Rate this session
        </button>
      )}
    </div>
  );
}
