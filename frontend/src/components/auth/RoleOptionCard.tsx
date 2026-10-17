import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

export interface RoleOptionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Selectable card for the sign-up "I'm a student / I'm a mentor"
 * role picker.
 */
export function RoleOptionCard({
  icon,
  title,
  description,
  selected,
  onSelect,
}: RoleOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'flex flex-1 flex-col items-start gap-3 rounded-2xl p-5 text-left transition-colors',
        selected ? 'border-2 border-primary bg-primary-soft' : 'border border-line bg-surface',
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={clsx(
            'flex size-11 items-center justify-center rounded-xl',
            selected ? 'bg-primary text-ink-inverse' : 'bg-subtle text-ink',
          )}
        >
          {icon}
        </span>
        <span
          className={clsx(
            'flex size-5.5 items-center justify-center rounded-full',
            selected ? 'bg-primary' : 'border border-line',
          )}
        >
          {selected && <Check className="size-3.5 text-ink-inverse" strokeWidth={3} />}
        </span>
      </div>
      <p className="font-display text-lg font-semibold tracking-tight text-ink">{title}</p>
      <p className="font-sans text-sm text-ink-soft">{description}</p>
    </button>
  );
}
