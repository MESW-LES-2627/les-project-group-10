import { Link } from 'react-router-dom';
import { Avatar, Tag, buttonVariants } from '@/components/ui';
import type { AvatarTone, TagTone } from '@/components/ui';
import { gatePath } from '@/lib/auth';

export interface SavedMentorCardProps {
  mentorId: string;
  initials: string;
  avatarTone: AvatarTone;
  name: string;
  role: string;
  tag: string;
  tagTone: TagTone;
}

/**
 * Small mentor tile in the dashboard's "Saved mentors" grid, with a
 * one-click "Book again" shortcut.
 */
export function SavedMentorCard({
  mentorId,
  initials,
  avatarTone,
  name,
  role,
  tag,
  tagTone,
}: SavedMentorCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 rounded-2xl bg-canvas p-4">
      <div className="flex items-center gap-2.5">
        <Avatar initials={initials} tone={avatarTone} size="sm" />
        <div className="flex min-w-0 flex-col gap-px">
          <p className="truncate font-sans text-base font-semibold text-ink">{name}</p>
          <p className="truncate font-sans text-xs font-medium text-ink-muted">{role}</p>
        </div>
      </div>
      <Tag label={tag} tone={tagTone} />
      <Link
        to={gatePath(`/mentors/${mentorId}#book`)}
        className={buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true })}
      >
        Book again
      </Link>
    </div>
  );
}
