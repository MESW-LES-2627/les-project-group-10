import { forwardRef, useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  /** Message shown under the field, e.g. a validation error from the API. */
  error?: string;
}

/**
 * Labeled multi-line text field, with an optional hint (e.g. a
 * character counter) shown next to the label.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor={textareaId} className="font-sans text-sm font-medium text-ink">
            {label}
          </label>
          {hint && <span className="font-sans text-xs text-ink-muted">{hint}</span>}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={clsx(
            'h-32 w-full resize-none rounded-[10px] border bg-surface p-4 font-sans text-base text-ink placeholder:text-ink-muted focus:outline-none',
            error ? 'border-danger' : 'border-line focus:border-line-strong',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} role="alert" className="font-sans text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
