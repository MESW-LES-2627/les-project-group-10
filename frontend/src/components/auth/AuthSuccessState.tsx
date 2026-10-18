import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface AuthSuccessStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Centered confirmation panel shown after a successful auth action
 * (e.g. reset email sent, password changed).
 */
export function AuthSuccessState({ title, description, action }: AuthSuccessStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft">
        <CheckCircle2 className="size-7 text-primary" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="font-sans text-base text-ink-soft">{description}</p>
      </div>
      {action}
    </div>
  );
}
