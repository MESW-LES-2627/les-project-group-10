import clsx from 'clsx';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Selectable filter pill (e.g. for picking subject areas).
 */
export function Chip({ label, selected = false, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'rounded-full px-4 py-2.25 font-sans text-sm font-medium transition-colors',
        selected ? 'bg-primary text-ink-inverse' : 'border border-line bg-surface text-ink-soft',
        className,
      )}
    >
      {label}
    </button>
  );
}
