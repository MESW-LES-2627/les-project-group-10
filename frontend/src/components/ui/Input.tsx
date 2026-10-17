import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  onTrailingIconClick?: () => void;
}

/**
 * Labeled text field with optional leading/trailing icon slots
 * (e.g. a mail icon, or a password-visibility toggle).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, leadingIcon, trailingIcon, onTrailingIconClick, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex w-full flex-col gap-2">
        <label htmlFor={inputId} className="font-sans text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex h-13 w-full items-center gap-3 rounded-[10px] border border-line bg-surface px-4 focus-within:border-line-strong">
          {leadingIcon && <span className="flex shrink-0 text-ink-muted">{leadingIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'min-w-0 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-muted focus:outline-none',
              className,
            )}
            {...props}
          />
          {trailingIcon &&
            (onTrailingIconClick ? (
              <button type="button" onClick={onTrailingIconClick} className="flex shrink-0 text-ink-muted">
                {trailingIcon}
              </button>
            ) : (
              <span className="flex shrink-0 text-ink-muted">{trailingIcon}</span>
            ))}
        </div>
      </div>
    );
  },
);
Input.displayName = 'Input';
