import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Message shown under the field, e.g. a validation error from the API. */
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  onTrailingIconClick?: () => void;
}

/**
 * Labeled text field with optional leading/trailing icon slots
 * (e.g. a mail icon, or a password-visibility toggle).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, leadingIcon, trailingIcon, onTrailingIconClick, id, className, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex w-full flex-col gap-2">
        <label htmlFor={inputId} className="font-sans text-sm font-medium text-ink">
          {label}
        </label>
        <div
          className={clsx(
            'flex h-13 w-full items-center gap-3 rounded-[10px] border bg-surface px-4',
            error ? 'border-danger' : 'border-line focus-within:border-line-strong',
          )}
        >
          {leadingIcon && <span className="flex shrink-0 text-ink-muted">{leadingIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={clsx(
              'min-w-0 flex-1 bg-transparent font-sans text-base text-ink placeholder:text-ink-muted focus:outline-none',
              className,
            )}
            {...props}
          />
          {trailingIcon &&
            (onTrailingIconClick ? (
              <button
                type="button"
                onClick={onTrailingIconClick}
                className="flex shrink-0 text-ink-muted"
              >
                {trailingIcon}
              </button>
            ) : (
              <span className="flex shrink-0 text-ink-muted">{trailingIcon}</span>
            ))}
        </div>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="font-sans text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
