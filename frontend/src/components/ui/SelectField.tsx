import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectFieldProps {
  label: string;
  leadingIcon?: ReactNode;
  options: string[];
  value: string | null;
  onChange: (next: string) => void;
  placeholder?: string;
}

/**
 * Dropdown field for picking one value from a fixed option list
 * (e.g. study level).
 */
export function SelectField({
  label,
  leadingIcon,
  options,
  value,
  onChange,
  placeholder,
}: SelectFieldProps) {
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

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex w-full flex-col gap-2">
      <label htmlFor={fieldId} className="font-sans text-sm font-medium text-ink">
        {label}
      </label>

      <button
        type="button"
        id={fieldId}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-13 w-full items-center gap-3 rounded-[10px] border border-line bg-surface px-4 text-left focus:border-line-strong focus:outline-none"
      >
        {leadingIcon && <span className="flex shrink-0 text-ink-muted">{leadingIcon}</span>}
        <span
          className={clsx(
            'min-w-0 flex-1 truncate font-sans text-base',
            value ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {value ?? placeholder}
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
          className="absolute left-0 top-full z-10 mt-2 max-h-64 w-full overflow-y-auto rounded-[10px] border border-line bg-surface p-1.5 shadow-[0px_16px_40px_0px_rgba(13,43,36,0.15)]"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => selectOption(option)}
                className={clsx(
                  'flex w-full items-center rounded-lg px-3 py-2.5 text-left font-sans text-base hover:bg-subtle',
                  option === value ? 'font-medium text-primary' : 'text-ink',
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
