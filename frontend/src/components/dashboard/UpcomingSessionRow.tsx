import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, buttonVariants } from '@/components/ui';
import type { AvatarTone } from '@/components/ui';
import { gatePath } from '@/lib/auth';

export interface UpcomingSessionRowProps {
  mentorId: string;
  initials: string;
  avatarTone: AvatarTone;
  mentorName: string;
  service: string;
  time: string;
  highlighted?: boolean;
  action: 'join' | 'details';
}

/**
 * One row in the dashboard's "Upcoming sessions" list. The next
 * session is highlighted with a "Join now" CTA; the rest get
 * "Details".
 */
export function UpcomingSessionRow({
  mentorId,
  initials,
  avatarTone,
  mentorName,
  service,
  time,
  highlighted = false,
  action,
}: UpcomingSessionRowProps) {
  return (
    <div
      className={
        highlighted
          ? 'flex w-full items-center gap-4 rounded-2xl bg-primary-soft p-4'
          : 'flex w-full items-center gap-4 rounded-2xl bg-canvas p-4'
      }
    >
      <Avatar initials={initials} tone={avatarTone} size="md" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-sans text-base font-semibold text-ink">{mentorName}</p>
        <p className="font-sans text-sm text-ink-muted">{service}</p>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-primary" />
          <p className="font-sans text-xs font-medium text-primary">{time}</p>
        </div>
      </div>
      {action === 'join' ? (
        <Link
          to={gatePath(`/mentors/${mentorId}`)}
          className={buttonVariants({ variant: 'blue', size: 'md' })}
        >
          Join now
        </Link>
      ) : (
        <Link
          to={gatePath(`/mentors/${mentorId}`)}
          className={buttonVariants({ variant: 'outlined', size: 'md' })}
        >
          Details
        </Link>
      )}
    </div>
  );
}
