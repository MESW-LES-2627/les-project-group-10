import clsx from 'clsx';

export type TagTone = 'green' | 'blue' | 'orange' | 'yellow' | 'dark';

const toneStyles: Record<TagTone, string> = {
  green: 'bg-primary-soft text-primary',
  blue: 'bg-secondary-soft text-secondary',
  orange: 'bg-tertiary-soft text-tertiary-strong',
  yellow: 'bg-accent-soft text-accent-strong',
  dark: 'bg-primary text-ink-inverse',
};

export interface TagProps {
  label: string;
  tone?: TagTone;
  className?: string;
}

/**
 * Small pill label for a skill/subject, colored by `tone`.
 */
export function Tag({ label, tone = 'green', className }: TagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2.5 py-1 font-sans text-xs font-medium',
        toneStyles[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
