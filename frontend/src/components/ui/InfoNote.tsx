import type { ReactNode } from 'react';
import clsx from 'clsx';

export type InfoNoteTone = 'blue' | 'accent';

export interface InfoNoteProps {
  icon: ReactNode;
  tone?: InfoNoteTone;
  children: ReactNode;
  className?: string;
}

/**
 * Icon + text callout box used for inline tips and prototype notices.
 */
export function InfoNote({ icon, tone = 'blue', children, className }: InfoNoteProps) {
  const isAccent = tone === 'accent';

  return (
    <div
      className={clsx(
        'flex w-full gap-3 rounded-xl p-4',
        isAccent ? 'bg-accent-soft' : 'bg-secondary-soft',
        className,
      )}
    >
      <span className={clsx('flex shrink-0', isAccent ? 'text-accent-strong' : 'text-secondary')}>
        {icon}
      </span>
      <p
        className={clsx(
          'flex-1 font-sans text-sm',
          isAccent ? 'text-accent-strong' : 'text-secondary',
        )}
      >
        {children}
      </p>
    </div>
  );
}
