import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface MultiSelectFieldProps {
  label: string;
  leadingIcon?: ReactNode;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/**
 * Dropdown field for picking several values from a fixed option list
 * (e.g. languages spoken), shown as a comma-separated summary.
 */
export function MultiSelectField({
  label,
  leadingIcon,
  options,
  selected,
  onChange,
  placeholder,
}: MultiSelectFieldProps) {
  const fieldId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function toggleOption(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  return (
    <div ref={containerRef} className="relative flex w-full flex-col gap-2">
      <label htmlFor={fieldId} className="font-sans text-sm font-medium text-ink">
        {label}
      </label>

      <button
        type="button"
        id={fieldId}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-13 w-full items-center gap-3 rounded-[10px] border border-line bg-surface px-4 text-left focus:border-line-strong focus:outline-none"
      >
        {leadingIcon && <span className="flex shrink-0 text-ink-muted">{leadingIcon}</span>}
        <span
          className={clsx(
            'min-w-0 flex-1 truncate font-sans text-base',
            selected.length ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDown
          className={clsx(
            'size-5 shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 top-full z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-[10px] border border-line bg-surface p-1.5 shadow-[0px_16px_40px_0px_rgba(13,43,36,0.15)]"
        >
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(option)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-subtle"
                >
                  <span
                    className={clsx(
                      'flex size-5 shrink-0 items-center justify-center rounded-[6px] border',
                      isSelected ? 'border-primary bg-primary' : 'border-line bg-surface',
                    )}
                  >
                    {isSelected && <Check className="size-3.5 text-ink-inverse" strokeWidth={3} />}
                  </span>
                  <span className="font-sans text-base text-ink">{option}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
