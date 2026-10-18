import { Sparkles } from 'lucide-react';
import { Avatar, Tag } from '@/components/ui';
import type { TagTone } from '@/components/ui';
import { pluralize } from '@/lib/mentorProfile';

export interface ProfilePreviewTag {
  label: string;
  tone: TagTone;
}

export interface ProfilePreviewCardProps {
  initials: string;
  name: string;
  roleLine: string;
  tags: ProfilePreviewTag[];
  fromPrice: string;
  servicesCount: number;
  slotsCount: number;
}

/**
 * Live "this is what students will see" preview of the mentor's
 * public card, shown on the availability onboarding step.
 */
export function ProfilePreviewCard({
  initials,
  name,
  roleLine,
  tags,
  fromPrice,
  servicesCount,
  slotsCount,
}: ProfilePreviewCardProps) {
  return (
    <div className="flex w-full flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4.5 text-tertiary" />
        <p className="font-sans text-base font-semibold text-ink">This is what students will see</p>
      </div>

      <div className="flex w-full items-center gap-4">
        <Avatar initials={initials} size="md" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">{name}</p>
          <p className="font-sans text-sm text-ink-muted">{roleLine}</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Tag key={tag.label} label={tag.label} tone={tag.tone} />
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            From {fromPrice}
          </p>
          <p className="font-sans text-xs font-medium text-ink-muted">
            {pluralize(servicesCount, 'service')} · {pluralize(slotsCount, 'slot')}/week
          </p>
        </div>
      </div>
    </div>
  );
}
