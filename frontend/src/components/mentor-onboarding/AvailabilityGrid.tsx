import { Fragment } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const ROWS = [
  { key: 'morning', label: 'Morning', hint: '9–12' },
  { key: 'afternoon', label: 'Afternoon', hint: '13–17' },
  { key: 'evening', label: 'Evening', hint: '18–21' },
] as const;

export interface AvailabilityGridProps {
  selected: Set<string>;
  onToggle: (key: string) => void;
}

/**
 * Weekly morning/afternoon/evening grid of toggle cells a mentor uses
 * to mark the slots they're open to be booked for. Uses a fractional
 * grid so the 7 day columns always fit the available width exactly.
 */
export function AvailabilityGrid({ selected, onToggle }: AvailabilityGridProps) {
  return (
    <div className="grid w-full grid-cols-[88px_repeat(7,1fr)] gap-2">
      <div />
      {DAYS.map((day) => (
        <div key={day} className="flex h-5 items-start justify-center">
          <p className="font-sans text-xs font-medium text-ink-muted">{day}</p>
        </div>
      ))}

      {ROWS.map((row) => (
        <Fragment key={row.key}>
          <div className="flex flex-col justify-center">
            <p className="font-sans text-sm text-ink">{row.label}</p>
            <p className="font-sans text-xs text-ink-muted">{row.hint}</p>
          </div>
          {DAYS.map((day) => {
            const key = `${row.key}-${day}`;
            const active = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(key)}
                className={clsx(
                  'flex h-11 w-full items-center justify-center rounded-[10px] transition-colors',
                  active ? 'bg-primary' : 'border border-line bg-canvas',
                )}
              >
                {active && <Check className="size-4 text-ink-inverse" />}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
