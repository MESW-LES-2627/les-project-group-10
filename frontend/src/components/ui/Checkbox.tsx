import { useId } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  id?: string;
}

/**
 * Labeled checkbox styled to match the design system (not a native
 * checkbox appearance).
 */
export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label htmlFor={checkboxId} className="inline-flex cursor-pointer items-center gap-2.5">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-line bg-surface peer-checked:border-primary peer-checked:bg-primary">
        <Check className="size-3.5 text-ink-inverse opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <span className="font-sans text-sm text-ink-soft">{label}</span>
    </label>
  );
}
