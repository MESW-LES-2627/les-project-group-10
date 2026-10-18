import { forwardRef, useId } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
}

/**
 * Labeled multi-line text field, with an optional hint (e.g. a
 * character counter) shown next to the label.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, id, className, ...props }, ref) => {
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
          className={clsx(
            'h-32 w-full resize-none rounded-[10px] border border-line bg-surface p-4 font-sans text-base text-ink placeholder:text-ink-muted focus:border-line-strong focus:outline-none',
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
